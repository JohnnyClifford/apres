const request = require('supertest');
const User = require('../src/models/User');
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

async function createShift(managerToken, assignedTo) {
  const res = await request(app)
    .post('/api/shifts')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      venue: 'Test Venue',
      date: '2026-11-15',
      startTime: '09:00',
      endTime: '17:00',
      role: 'staff',
      assignedTo,
    });
  return res.body.shift;
}

describe('POST /api/swaps', () => {
  it('creates a pending swap when the requester is assigned', async () => {
    const alice = await registerStaff('alice@example.com', 'Alice');
    const bob = await registerStaff('bob@example.com', 'Bob');
    const manager = await registerManager('mgr-swap1@example.com');
    const shift = await createShift(manager.token, alice.user.id);

    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: bob.user.id });

    expect(res.status).toBe(201);
    expect(res.body.swap.status).toBe('pending');
  });

  it('rejects a requester who is not the assignee', async () => {
    const alice = await registerStaff('alice2@example.com', 'Alice');
    const bob = await registerStaff('bob2@example.com', 'Bob');
    const manager = await registerManager('mgr-swap2@example.com');
    const shift = await createShift(manager.token, alice.user.id);

    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ shiftId: shift._id, toUserId: alice.user.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not assigned/i);
  });

  it('rejects a self-swap', async () => {
    const alice = await registerStaff('alice3@example.com', 'Alice');
    const manager = await registerManager('mgr-swap3@example.com');
    const shift = await createShift(manager.token, alice.user.id);

    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: alice.user.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });

  it('rejects a second pending swap for the same shift', async () => {
    const alice = await registerStaff('alice4@example.com', 'Alice');
    const bob = await registerStaff('bob4@example.com', 'Bob');
    const manager = await registerManager('mgr-swap4@example.com');
    const shift = await createShift(manager.token, alice.user.id);

    await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: bob.user.id });

    const second = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: bob.user.id });

    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/pending swap/i);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/swaps').send({});
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/swaps/:id', () => {
  async function setupPendingSwap(suffix) {
    const alice = await registerStaff(`alice-${suffix}@example.com`, 'Alice');
    const bob = await registerStaff(`bob-${suffix}@example.com`, 'Bob');
    const manager = await registerManager(`mgr-${suffix}@example.com`);
    const shift = await createShift(manager.token, alice.user.id);
    const swapRes = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: bob.user.id });
    return { alice, bob, manager, swap: swapRes.body.swap };
  }

  it('lets a manager accept a pending swap', async () => {
    const { manager, swap } = await setupPendingSwap('accept');
    const res = await request(app)
      .patch(`/api/swaps/${swap._id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    expect(res.body.swap.status).toBe('accepted');
    expect(res.body.swap.resolvedBy).toBeTruthy();
  });

  it('lets a manager reject a pending swap', async () => {
    const { manager, swap } = await setupPendingSwap('reject');
    const res = await request(app)
      .patch(`/api/swaps/${swap._id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.swap.status).toBe('rejected');
  });

  it('rejects staff attempting to accept', async () => {
    const { alice, swap } = await setupPendingSwap('forbid');
    const res = await request(app)
      .patch(`/api/swaps/${swap._id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(403);
  });

  it('rejects transitioning a resolved swap', async () => {
    const { manager, swap } = await setupPendingSwap('double');
    await request(app)
      .patch(`/api/swaps/${swap._id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'accepted' });

    const res = await request(app)
      .patch(`/api/swaps/${swap._id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/swaps', () => {
  it('returns all swaps for a manager', async () => {
    const alice = await registerStaff('alice-list@example.com', 'Alice');
    const bob = await registerStaff('bob-list@example.com', 'Bob');
    const manager = await registerManager('mgr-list@example.com');
    const shift = await createShift(manager.token, alice.user.id);

    await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: bob.user.id });

    const res = await request(app)
      .get('/api/swaps')
      .set('Authorization', `Bearer ${manager.token}`);
    expect(res.status).toBe(200);
    expect(res.body.swaps.length).toBeGreaterThan(0);
  });

  it('returns only own swaps for staff', async () => {
    const alice = await registerStaff('alice-scope@example.com', 'Alice');
    const bob = await registerStaff('bob-scope@example.com', 'Bob');
    const carol = await registerStaff('carol-scope@example.com', 'Carol');
    const manager = await registerManager('mgr-scope@example.com');
    const shift = await createShift(manager.token, alice.user.id);
    await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: bob.user.id });

    const res = await request(app)
      .get('/api/swaps')
      .set('Authorization', `Bearer ${carol.token}`);
    expect(res.status).toBe(200);
    expect(res.body.swaps).toHaveLength(0);
  });
});
