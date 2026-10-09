const request = require('supertest');
const { createApp } = require('../src/app');

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('apres-api');
  });
});