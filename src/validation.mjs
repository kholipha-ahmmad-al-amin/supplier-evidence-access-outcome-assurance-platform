import { inputError } from './errors.mjs';

export const text = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw inputError(`${name} is required`);
  return value.trim();
};

export const outcomeScope = (value) => {
  value = text(value, 'outcome scope');
  if (!['evidence_access_outcome', 'evidence_export_outcome', 'exception_access_outcome'].includes(value)) throw inputError('outcome scope is invalid');
  return value;
};

export const actor = (headers) => ({ id: headers['x-actor-id'], role: headers['x-actor-role'] });
