const request = require('supertest');
const User = require('../src/models/User');
const TipPoolRule = require('../src/models/TipPoolRule');
const TipDistribution = require('../src/models/TipDistribution');
const { createApp } = require('../src/app');

const app = createApp();

async function registerStaff(email, name = 'Staff') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name });
  return res.body;
}

async function registerManager(email) {
  await registerStaff(email, 'Manager');
  await User.updateOne({ email }, { role: 'manager' });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  return login.body;
}

const shifts = [
  { userId: 'alice', hours: 8, role: 'staff' },
  { userId: 'bob', hours: 4, role: 'staff' },
];

describe('POST /api/tips/calculate', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/tips/calculate')
      .send({ venue: 'Test Venue', totalTipsCents: 3000, shifts });

    expect(res.status).toBe(401);
  });

  it('rejects staff users', async () => {
    const staff = await registerStaff('tips-staff@example.com');
    const res = await request(app)
      .post('/api/tips/calculate')
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ venue: 'Test Venue', totalTipsCents: 3000, shifts });

    expect(res.status).toBe(403);
  });

  it('returns an hours-based split when the venue has no rule', async () => {
    const manager = await registerManager('tips-hours-manager@example.com');
    const res = await request(app)
      .post('/api/tips/calculate')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ venue: 'Hours Venue', totalTipsCents: 3000, shifts });

    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('hours');
    expect(res.body.distribution).toEqual([
      { userId: 'alice', amountCents: 2000 },
      { userId: 'bob', amountCents: 1000 },
    ]);
  });

  it('returns a hybrid split when the venue has a hybrid rule', async () => {
    const manager = await registerManager('tips-hybrid-manager@example.com');
    await TipPoolRule.create({
      venue: 'Hybrid Venue',
      strategy: 'hybrid',
      basePerShiftCents: 1000,
    });

    const res = await request(app)
      .post('/api/tips/calculate')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ venue: 'Hybrid Venue', totalTipsCents: 5000, shifts });

    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('hybrid');
    expect(res.body.distribution).toEqual([
      { userId: 'alice', amountCents: 3000 },
      { userId: 'bob', amountCents: 2000 },
    ]);
  });

  it('validates missing required fields', async () => {
    const manager = await registerManager('tips-validation-manager@example.com');
    const res = await request(app)
      .post('/api/tips/calculate')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ venue: 'Test Venue' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/tips/distribute', () => {
  it('saves a tip distribution and returns 201', async () => {
    const manager = await registerManager('tips-distribute-manager@example.com');
    const staff = await registerStaff('tips-distribute-staff@example.com');
    const distributionShifts = [
      { userId: manager.user.id, hours: 8, role: 'manager' },
      { userId: staff.user.id, hours: 4, role: 'staff' },
    ];

    const res = await request(app)
      .post('/api/tips/distribute')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({
        venue: 'Distribution Venue',
        date: '2026-11-15',
        totalTipsCents: 3000,
        shifts: distributionShifts,
      });

    expect(res.status).toBe(201);
    expect(res.body.distribution.strategy).toBe('hours');

    const saved = await TipDistribution.findById(res.body.distribution._id);
    expect(saved).toBeTruthy();
    expect(saved.venue).toBe('Distribution Venue');
    expect(saved.totalTipsCents).toBe(3000);
    expect(saved.breakdown).toHaveLength(2);
  });

  it('validates missing required fields', async () => {
    const manager = await registerManager('tips-distribute-validation@example.com');
    const res = await request(app)
      .post('/api/tips/distribute')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ venue: 'Distribution Venue', date: '2026-11-15' });

    expect(res.status).toBe(400);
  });
});
