const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');

const app = createApp();

async function registerStaff(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name: 'Staff' });
  return res.body;
}

async function registerManager(email) {
  const registered = await registerStaff(email);
  await User.updateOne({ _id: registered.user.id }, { role: 'manager' });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  return res.body;
}

const WEEK = '2026-11-02';
const SECOND_WEEK = '2026-11-09';
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

describe('availability submission status', () => {
  it('new availability submissions start as pending', async () => {
    const { token } = await registerStaff('status-new@example.com');
    await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    const res = await request(app)
      .get(`/api/availability/me?weekStart=${WEEK}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.availability.status).toBe('pending');
  });

  it('saving again resets status to pending', async () => {
    const staff = await registerStaff('status-reset-staff@example.com');
    const manager = await registerManager('status-reset-manager@example.com');
    const created = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    await request(app)
      .patch(`/api/availability/${created.body.availability._id}/status`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'approved' });

    await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    const res = await request(app)
      .get(`/api/availability/me?weekStart=${WEEK}`)
      .set('Authorization', `Bearer ${staff.token}`);

    expect(res.body.availability.status).toBe('pending');
    expect(res.body.availability.resolvedBy).toBeNull();
    expect(res.body.availability.resolvedAt).toBeNull();
  });

  it('manager can approve pending availability', async () => {
    const staff = await registerStaff('approve-staff@example.com');
    const manager = await registerManager('approve-manager@example.com');
    const created = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    const res = await request(app)
      .patch(`/api/availability/${created.body.availability._id}/status`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.availability.status).toBe('approved');
    expect(res.body.availability.resolvedBy).toBe(manager.user.id);
    expect(res.body.availability.resolvedAt).toBeTruthy();
  });

  it('manager can reject pending availability', async () => {
    const staff = await registerStaff('reject-staff@example.com');
    const manager = await registerManager('reject-manager@example.com');
    const created = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    const res = await request(app)
      .patch(`/api/availability/${created.body.availability._id}/status`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.availability.status).toBe('rejected');
    expect(res.body.availability.resolvedBy).toBe(manager.user.id);
    expect(res.body.availability.resolvedAt).toBeTruthy();
  });

  it('staff cannot approve their own availability', async () => {
    const staff = await registerStaff('self-approve@example.com');
    const created = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    const res = await request(app)
      .patch(`/api/availability/${created.body.availability._id}/status`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(403);
  });

  it('staff cannot view pending submissions', async () => {
    const { token } = await registerStaff('pending-staff@example.com');
    const res = await request(app)
      .get('/api/availability/pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('GET /pending returns only pending submissions', async () => {
    const alice = await registerStaff('pending-alice@example.com');
    const bob = await registerStaff('pending-bob@example.com');
    const carol = await registerStaff('pending-carol@example.com');
    const manager = await registerManager('pending-manager@example.com');
    const aliceSubmission = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });
    const bobSubmission = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });
    await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ weekStart: SECOND_WEEK, slots: SLOTS });

    await request(app)
      .patch(`/api/availability/${bobSubmission.body.availability._id}/status`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'approved' });

    const pending = await request(app)
      .get('/api/availability/pending')
      .set('Authorization', `Bearer ${manager.token}`);
    const filtered = await request(app)
      .get(`/api/availability/pending?weekStart=${WEEK}`)
      .set('Authorization', `Bearer ${manager.token}`);

    expect(pending.status).toBe(200);
    expect(pending.body.pending.map((item) => item._id)).toEqual(expect.arrayContaining([
      aliceSubmission.body.availability._id,
    ]));
    expect(pending.body.pending.map((item) => item._id)).not.toContain(bobSubmission.body.availability._id);
    expect(filtered.body.pending).toHaveLength(1);
    expect(filtered.body.pending[0]._id).toBe(aliceSubmission.body.availability._id);
  });

  it('GET /week?status=approved filters by status', async () => {
    const pendingStaff = await registerStaff('week-pending@example.com');
    const approvedStaff = await registerStaff('week-approved@example.com');
    const manager = await registerManager('week-manager@example.com');
    await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${pendingStaff.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });
    const approved = await request(app)
      .put('/api/availability/me')
      .set('Authorization', `Bearer ${approvedStaff.token}`)
      .send({ weekStart: WEEK, slots: SLOTS });

    await request(app)
      .patch(`/api/availability/${approved.body.availability._id}/status`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'approved' });

    const res = await request(app)
      .get(`/api/availability/week?weekStart=${WEEK}&status=approved`)
      .set('Authorization', `Bearer ${manager.token}`);

    expect(res.status).toBe(200);
    expect(res.body.availabilities).toHaveLength(1);
    expect(res.body.availabilities[0]._id).toBe(approved.body.availability._id);
    expect(res.body.availabilities[0].status).toBe('approved');
  });
});
