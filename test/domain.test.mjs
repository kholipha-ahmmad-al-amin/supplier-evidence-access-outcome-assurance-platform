import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccessOutcomeService } from '../src/domain.mjs';
import { AtomicStore } from '../src/store.mjs';

class MemoryStore {
  constructor() {
    this.database = { accessOutcomeReviews: [] };
    this.writes = 0;
  }
  read() { return structuredClone(this.database); }
  write(data) { this.database = structuredClone(data); this.writes += 1; }
}

const owner = { id: 'owner-834', role: 'evidence_owner' };
const input = {
  supplierId: 'SUP-834',
  evidenceReference: 'EVD-834',
  outcomeReference: 'OUT-834-ACCESS-01',
  outcomeScope: 'evidence_access_outcome'
};
const chain = [
  { action: 'reviewOutcome', role: 'outcome_reviewer' },
  { action: 'verifyEffect', role: 'outcome_effect_verifier' },
  { action: 'validateImpact', role: 'outcome_impact_validator' },
  { action: 'confirmOutcome', role: 'outcome_authority' },
  { action: 'closeOutcome', role: 'outcome_registrar' }
];

describe('AccessOutcomeService', () => {
  it('records a complete independently controlled access-outcome lifecycle', () => {
    const store = new MemoryStore();
    const service = new AccessOutcomeService(store);
    let review = service.submit(input, owner, 'request-submit-834');
    for (const step of chain) {
      review = service.transition(review.id, step.action, { note: `${step.action} completed` }, { id: step.role, role: step.role }, `request-${step.action}-834`);
    }
    expect(review.status).toBe('outcome_closed');
    expect(review.events.map((event) => event.type)).toContain('outcome_closed');
    expect(store.writes).toBe(6);
  });

  it('rejects invalid outcome scopes before persistence', () => {
    const store = new MemoryStore();
    const service = new AccessOutcomeService(store);
    expect(() => service.submit({ ...input, outcomeScope: 'other' }, owner, 'request-invalid-834')).toThrow('outcome scope is invalid');
    expect(store.writes).toBe(0);
  });

  it('preserves state when an actor lacks the required role', () => {
    const store = new MemoryStore();
    const service = new AccessOutcomeService(store);
    const review = service.submit(input, owner, 'request-role-834');
    expect(() => service.transition(review.id, 'reviewOutcome', { note: 'attempt' }, owner, 'request-role-denied-834')).toThrow('role outcome_reviewer is required');
    expect(service.get(review.id).status).toBe('submitted');
    expect(store.writes).toBe(1);
  });

  it('creates an empty collection when the data file is absent', () => {
    const directory = mkdtempSync(join(tmpdir(), 'access-outcome-assurance-'));
    try {
      const store = new AtomicStore(join(directory, 'data', 'access-outcome-reviews.json'));
      expect(store.read()).toEqual({ accessOutcomeReviews: [] });
      store.write({ accessOutcomeReviews: [] });
      expect(store.read()).toEqual({ accessOutcomeReviews: [] });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
