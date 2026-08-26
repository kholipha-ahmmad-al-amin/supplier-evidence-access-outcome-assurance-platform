export class DomainError extends Error { constructor(code, message, status = 422) { super(message); this.code = code; this.status = status; } }
export const inputError = (message) => new DomainError('invalid_input', message);
export const forbidden = (message) => new DomainError('forbidden', message, 403);
export const conflict = (message) => new DomainError('invalid_state', message, 409);
export const missing = (message) => new DomainError('not_found', message, 404);
