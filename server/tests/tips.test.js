const request = require('supertest');
const { createApp } = require('../src/app');
const TipDistribution = require('../src/models/TipDistribution');
const User = require('../src/models/User');
const bcrypt = require('bcrypt');

describe('POST /api/tips/calculate', () => {
  const app = createApp();
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'tip-manager@test.com', password: 'password123', name: 'Mgr' });

    await User.findByIdAndUpdate(res.body.user.id, { role: 'manager' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tip-manager@test.com', password: 'password123' });

    token = loginRes.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'tip-manager@test.com' });
  });

  it('returns an hours-based split when the venue has no rule', async () => {
    const res = await request(app)
      .post('/api/tips/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        venue: 'No Rule Venue',
        totalTipsCents: 3000,
        shifts: [
          { userId: 'alice', role: 'staff', hours: 8 },
          { userId: 'bob', role: 'staff', hours: 4 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('hours');
    expect(res.body.distribution).toEqual([
      { userId: 'alice', amountCents: 2000, hours: 8 },
      { userId: 'bob', amountCents: 1000, hours: 4 },
    ]);
  });
});

describe('GET /api/tips/my-payouts', () => {
  const app = createApp();
  let alice, bob, manager;

  beforeAll(async () => {
    const mRes = await request(app).post('/api/auth/register')
      .send({ email: 'pay-mgr@test.com', password: 'password123', name: 'Mgr' });
    await User.findByIdAndUpdate(mRes.body.user.id, { role: 'manager' });
    const mlRes = await request(app).post('/api/auth/login')
      .send({ email: 'pay-mgr@test.com', password: 'password123' });
    manager = { user: mlRes.body.user, token: mlRes.body.token };

    const aliceRes = await request(app).post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' });
    alice = { user: aliceRes.body.user, token: aliceRes.body.token };

    const bobRes = await request(app).post('/api/auth/register')
      .send({ email: 'bob@test.com', password: 'password123', name: 'Bob' });
    bob = { user: bobRes.body.user, token: bobRes.body.token };

    await TipDistribution.create([
      {
        venue: 'December Venue',
        date: '2026-12-15',
        totalTipsCents: 3000,
        strategy: 'hours',
        breakdown: [{ userId: alice.user.id, amountCents: 3000 }],
        createdBy: manager.user.id,
      },
      {
        venue: 'Bob Only Venue',
        date: '2027-01-15',
        totalTipsCents: 1000,
        strategy: 'hours',
        breakdown: [{ userId: bob.user.id, amountCents: 1000 }],
        createdBy: manager.user.id,
      },
    ]);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['pay-mgr@test.com', 'alice@test.com', 'bob@test.com'] } });
    await TipDistribution.deleteMany({ venue: { $in: ['December Venue', 'Bob Only Venue'] } });
  });

  it("returns only the authenticated staff member's payouts", async () => {
    const res = await request(app)
      .get('/api/tips/my-payouts')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.distributions).toHaveLength(1);
    expect(res.body.distributions[0]).toMatchObject({
      venue: 'December Venue',
      date: '2026-12-15',
    });
  });
});