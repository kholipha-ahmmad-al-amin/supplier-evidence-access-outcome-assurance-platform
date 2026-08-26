import { conflict, forbidden, missing } from './errors.mjs';
import { outcomeScope, text } from './validation.mjs';

const transitions = {
  reviewOutcome: { from: 'submitted', to: 'outcome_reviewed', role: 'outcome_reviewer', event: 'outcome_reviewed' },
  verifyEffect: { from: 'outcome_reviewed', to: 'effect_verified', role: 'outcome_effect_verifier', event: 'outcome_effect_verified' },
  validateImpact: { from: 'effect_verified', to: 'impact_validated', role: 'outcome_impact_validator', event: 'outcome_impact_validated' },
  confirmOutcome: { from: 'impact_validated', to: 'outcome_confirmed', role: 'outcome_authority', event: 'access_outcome_confirmed' },
  closeOutcome: { from: 'outcome_confirmed', to: 'outcome_closed', role: 'outcome_registrar', event: 'outcome_closed' }
};

const timestamp = () => new Date().toISOString();
const requireRole = (actor, role) => {
  if (!actor?.id || actor.role !== role) throw forbidden(`role ${role} is required`);
};

export class AccessOutcomeService {
  constructor(store) {
    this.store = store;
  }

  submit(input, actor, requestId) {
    requireRole(actor, 'evidence_owner');
    const database = this.store.read();
    const now = timestamp();
    const review = {
      id: crypto.randomUUID(),
      supplierId: text(input.supplierId, 'supplier id'),
      evidenceReference: text(input.evidenceReference, 'evidence reference'),
      outcomeReference: text(input.outcomeReference, 'outcome reference'),
      outcomeScope: outcomeScope(input.outcomeScope),
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
      events: [{ type: 'access_outcome_submitted', actorId: actor.id, requestId, at: now }]
    };
    database.accessOutcomeReviews.push(review);
    this.store.write(database);
    return review;
  }

  transition(id, action, input, actor, requestId) {
    const policy = transitions[action];
    if (!policy) throw missing('action was not found');
    requireRole(actor, policy.role);
    const database = this.store.read();
    const review = database.accessOutcomeReviews.find((entry) => entry.id === id);
    if (!review) throw missing('access-outcome review was not found');
    if (review.status !== policy.from) throw conflict(`access-outcome review must be ${policy.from}`);
    const note = text(input.note, 'note');
    const now = timestamp();
    review.status = policy.to;
    review.updatedAt = now;
    review.events.push({ type: policy.event, actorId: actor.id, requestId, note, at: now });
    database.accessOutcomeReviews = database.accessOutcomeReviews.map((entry) => entry.id === id ? review : entry);
    this.store.write(database);
    return review;
  }

  get(id) {
    const review = this.store.read().accessOutcomeReviews.find((entry) => entry.id === id);
    if (!review) throw missing('access-outcome review was not found');
    return review;
  }
}
