const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

async function registerStaff(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name: 'Staff' });
  return res.body;
}

const WEEK = '2026-11-02';
const SLOTS = [{ date: '2026-11-03', startTime: '10:00', endTime: '14:00' }];

describe('PUT /api/availability/me', () => {
  it('creates availability for the week', async () => {
    const { token } = await registerStaff('av1@example.com');
    const res = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    expect(res.status).toBe(200);
    expect(res.body.availability.weekStart).toBe(WEEK);
    expect(res.body.availability.slots).toHaveLength(1);
  });

  it('upserts without creating a duplicate', async () => {
    const { token } = await registerStaff('av2@example.com');
    const first = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    const newSlots = [{ date: '2026-11-04', startTime: '12:00', endTime: '18:00' }];
    const second = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ weekStart: WEEK, slots: newSlots });

    expect(second.status).toBe(200);
    expect(second.body.availability._id).toBe(first.body.availability._id);
    expect(second.body.availability.slots[0].date).toBe('2026-11-04');
  });

  it('rejects missing slots', async () => {
    const { token } = await registerStaff('av3@example.com');
    const res = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ weekStart: WEEK });
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .put('/api/availability/me')
      .send({ weekStart: WEEK, slots: SLOTS });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/availability/me', () => {
  it('returns saved availability', async () => {
    const { token } = await registerStaff('av4@example.com');
    await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    const res = await request(app)
      .get(`/api/availability/me?weekStart=${WEEK}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.availability.weekStart).toBe(WEEK);
  });

  it('returns null when no document exists', async () => {
    const { token } = await registerStaff('av5@example.com');
    const res = await request(app)
      .get(`/api/availability/me?weekStart=${WEEK}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.availability).toBeNull();
  });

  it('rejects missing weekStart', async () => {
    const { token } = await registerStaff('av6@example.com');
    const res = await request(app)
      .get('/api/availability/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(`/api/availability/me?weekStart=${WEEK}`);
    expect(res.status).toBe(401);
  });
});