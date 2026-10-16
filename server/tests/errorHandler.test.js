const request = require('supertest');
const express = require('express');
const { notFound, errorHandler } = require('../src/middleware/errorHandler');

function appWithThrower(errToThrow) {
  const app = express();
  app.get('/boom', (req, res, next) => next(errToThrow));
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('uses err.status when provided', async () => {
    const err = Object.assign(new Error('Nope'), { status: 403 });
    const res = await request(appWithThrower(err)).get('/boom');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Nope');
  });

  it('defaults to 500 when err.status is missing', async () => {
    const res = await request(appWithThrower(new Error('kaboom'))).get('/boom');
    expect(res.status).toBe(500);
  });

  it('hides the message for 5xx responses', async () => {
    const res = await request(appWithThrower(new Error('secret internal detail'))).get('/boom');
    expect(res.body.error).toBe('Server error');
    expect(res.body.error).not.toMatch(/secret/);
  });

  it('exposes the message for 4xx responses', async () => {
    const err = Object.assign(new Error('Bad input'), { status: 400 });
    const res = await request(appWithThrower(err)).get('/boom');
    expect(res.body.error).toBe('Bad input');
  });

  it('does not log in the test environment', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await request(appWithThrower(new Error('silent'))).get('/boom');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('delegates to next when headers have already been sent', async () => {
    const app = express();
    app.get('/partial', (req, res, next) => {
      res.status(200).json({ ok: true });
      next(new Error('too late'));
    });
    app.use(errorHandler);
    const res = await request(app).get('/partial');
    expect(res.status).toBe(200);
  });
});