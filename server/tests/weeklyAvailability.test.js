const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');

const app = createApp();

async function registerUser(email, name, role = 'staff') {
  const registration = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name });

  if (role === 'staff') return registration.body;

  await User.updateOne({ email }, { role });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  return login.body;
}

const SLOTS = [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }];

describe('weekly availability API', () => {
  it('GET /me returns null when user has no availability yet', async () => {
    const alice = await registerUser('weekly-null@example.com', 'Alice');
    const res = await request(app)
      .get('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.weeklyAvailability).toBeNull();
  });

  it('PUT /me creates availability for a new user', async () => {
    const alice = await registerUser('weekly-create@example.com', 'Alice');
    const res = await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ slots: SLOTS });

    expect(res.status).toBe(200);
    expect(res.body.weeklyAvailability.slots).toHaveLength(1);
    expect(res.body.weeklyAvailability.slots[0].dayOfWeek).toBe(1);
  });

  it('PUT /me upserts updates to an existing record', async () => {
    const alice = await registerUser('weekly-upsert@example.com', 'Alice');
    await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ slots: SLOTS });
    await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ slots: [{ dayOfWeek: 2, startTime: '10:00', endTime: '16:00' }] });

    const res = await request(app)
      .get('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.body.weeklyAvailability.slots).toHaveLength(1);
    expect(res.body.weeklyAvailability.slots[0].dayOfWeek).toBe(2);
  });

  it('PUT /me rejects invalid dayOfWeek', async () => {
    const alice = await registerUser('weekly-day@example.com', 'Alice');
    const res = await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ slots: [{ dayOfWeek: 7, startTime: '09:00', endTime: '17:00' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dayOfWeek/i);
  });

  it('PUT /me rejects endTime before startTime', async () => {
    const alice = await registerUser('weekly-end@example.com', 'Alice');
    const res = await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ slots: [{ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/endTime.*after|before/i);
  });

  it('PUT /me rejects malformed time strings', async () => {
    const alice = await registerUser('weekly-time@example.com', 'Alice');
    const res = await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ slots: [{ dayOfWeek: 1, startTime: '9am', endTime: '5pm' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/time.*format|invalid/i);
  });

  it('PUT /me accepts an empty slots array', async () => {
    const alice = await registerUser('weekly-empty@example.com', 'Alice');
    const res = await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ slots: [] });

    expect(res.status).toBe(200);
    expect(res.body.weeklyAvailability.slots).toEqual([]);
  });

  it('GET /all returns all users availability for a manager', async () => {
    const alice = await registerUser('weekly-all-alice@example.com', 'Alice');
    const bob = await registerUser('weekly-all-bob@example.com', 'Bob');
    const manager = await registerUser('weekly-all-manager@example.com', 'Manager', 'manager');
    await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ slots: SLOTS });
    await request(app)
      .put('/api/weekly-availability/me')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ slots: [{ dayOfWeek: 5, startTime: '12:00', endTime: '20:00' }] });

    const res = await request(app)
      .get('/api/weekly-availability/all')
      .set('Authorization', `Bearer ${manager.token}`);

    expect(res.status).toBe(200);
    expect(res.body.weeklyAvailabilities.length).toBeGreaterThanOrEqual(2);
    expect(res.body.weeklyAvailabilities[0].user).toEqual(expect.objectContaining({
      name: expect.any(String),
      role: 'staff',
      email: expect.any(String),
    }));
  });

  it('GET /all is forbidden for staff', async () => {
    const alice = await registerUser('weekly-forbidden@example.com', 'Alice');
    const res = await request(app)
      .get('/api/weekly-availability/all')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(403);
  });
});
