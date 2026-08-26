import express from 'express';
import crypto from 'node:crypto';
import { DomainError } from './errors.mjs';
import { actor } from './validation.mjs';

export const createApp = (service) => {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.use((request, response, next) => {
    const header = request.get('x-request-id');
    request.requestId = header && /^[a-zA-Z0-9._-]{8,128}$/.test(header) ? header : crypto.randomUUID();
    response.set('x-request-id', request.requestId);
    next();
  });
  app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));
  app.post('/access-outcome-reviews', (request, response, next) => {
    try {
      response.status(201).json(service.submit(request.body, actor(request.headers), request.requestId));
    } catch (error) {
      next(error);
    }
  });
  app.get('/access-outcome-reviews/:id', (request, response, next) => {
    try {
      response.status(200).json(service.get(request.params.id));
    } catch (error) {
      next(error);
    }
  });
  app.post('/access-outcome-reviews/:id/:action', (request, response, next) => {
    try {
      response.status(200).json(service.transition(request.params.id, request.params.action, request.body, actor(request.headers), request.requestId));
    } catch (error) {
      next(error);
    }
  });
  app.use((error, request, response, _next) => {
    if (error instanceof DomainError) return response.status(error.status).json({ error: { code: error.code, message: error.message, requestId: request.requestId } });
    return response.status(500).json({ error: { code: 'internal_error', message: 'unexpected service error', requestId: request.requestId } });
  });
  return app;
};
