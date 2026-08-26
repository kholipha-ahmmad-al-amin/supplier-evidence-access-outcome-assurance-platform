import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.mjs';
import { AccessOutcomeService } from '../src/domain.mjs';

class MemoryStore {
  constructor() { this.database = { accessOutcomeReviews: [] }; }
  read() { return structuredClone(this.database); }
  write(data) { this.database = structuredClone(data); }
}

const headers = {
  'x-actor-id': 'owner-http-834',
  'x-actor-role': 'evidence_owner',
  'x-request-id': 'request-http-834'
};
const body = {
  supplierId: 'SUP-834',
  evidenceReference: 'EVD-834',
  outcomeReference: 'OUT-834-ACCESS-01',
  outcomeScope: 'evidence_access_outcome'
};

describe('access-outcome HTTP transport', () => {
  it('returns a valid client request identifier for accepted submission', async () => {
    const app = createApp(new AccessOutcomeService(new MemoryStore()));
    const response = await request(app).post('/access-outcome-reviews').set(headers).send(body);
    expect(response.status).toBe(201);
    expect(response.headers['x-request-id']).toBe(headers['x-request-id']);
    expect(response.body.status).toBe('submitted');
  });

  it('returns a structured 422 error for invalid input', async () => {
    const app = createApp(new AccessOutcomeService(new MemoryStore()));
    const response = await request(app).post('/access-outcome-reviews').set(headers).send({ ...body, outcomeScope: 'invalid' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('invalid_input');
    expect(response.body.error.requestId).toBe(headers['x-request-id']);
  });
});
