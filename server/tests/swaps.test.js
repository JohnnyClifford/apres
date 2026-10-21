const request = require('supertest');
const User = require('../src/models/User');
const Shift = require('../src/models/Shift');
const { createApp } = require('../src/app');

const app = createApp();

async function registerUser({ email, name = 'Test', role = 'staff' }) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name });

  if (role !== 'staff') {
    await User.updateOne({ email }, { role });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    return login.body;
  }
  return res.body;
}

async function createShiftForUser(managerToken, assignedToId, overrides = {}) {
  const res = await request(app)
    .post('/api/shifts')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      venue: 'Test Venue',
      date: '2026-11-02',
      startTime: '09:00',
      endTime: '17:00',
      role: 'staff',
      assignedTo: assignedToId,
      ...overrides,
    });
  return res.body.shift;
}

async function setupPendingSwap(suffix) {
  const manager = await registerUser({ email: `mgr-${suffix}@example.com`, role: 'manager' });
  const alice = await registerUser({ email: `alice-${suffix}@example.com`, name: 'Alice' });
  const bob = await registerUser({ email: `bob-${suffix}@example.com`, name: 'Bob' });

  const shift = await createShiftForUser(manager.token, alice.user.id);
  const requestedShift = await createShiftForUser(manager.token, bob.user.id);

  const res = await request(app)
    .post('/api/swaps')
    .set('Authorization', `Bearer ${alice.token}`)
    .send({ shiftId: shift._id, toUserId: bob.user.id, requestedShiftId: requestedShift._id });

  return { manager, alice, bob, shift, requestedShift, swap: res.body.swap };
}

describe('POST /api/swaps', () => {
  it('creates a pending swap request', async () => {
    const { swap, requestedShift } = await setupPendingSwap('create');
    expect(swap.status).toBe('pending');
    expect(swap.requestedShift).toBe(requestedShift._id);
  });

  it('broadcasts a newly requested swap', async () => {
    const io = { emit: jest.fn() };
    app.set('io', io);

    const manager = await registerUser({ email: 'mgr-event@example.com', role: 'manager' });
    const alice = await registerUser({ email: 'alice-event@example.com', name: 'Alice' });
    const bob = await registerUser({ email: 'bob-event@example.com', name: 'Bob' });
    const shift = await createShiftForUser(manager.token, alice.user.id);
    const requestedShift = await createShiftForUser(manager.token, bob.user.id, { startTime: '18:00', endTime: '22:00' });

    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: bob.user.id, requestedShiftId: requestedShift._id });

    expect(res.status).toBe(201);
    const requestedEvent = io.emit.mock.calls.find(([event]) => event === 'swap:requested');
    expect(requestedEvent[1]._id.toString()).toBe(res.body.swap._id);
  });

  it('rejects a requester who is not the assignee', async () => {
    const manager = await registerUser({ email: 'mgr-notassignee@example.com', role: 'manager' });
    const alice = await registerUser({ email: 'alice-notassignee@example.com', name: 'Alice' });
    const bob = await registerUser({ email: 'bob-notassignee@example.com', name: 'Bob' });
    const shift = await createShiftForUser(manager.token, bob.user.id);
    const requestedShift = await createShiftForUser(manager.token, bob.user.id, { startTime: '18:00', endTime: '22:00' });

    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ shiftId: shift._id, toUserId: bob.user.id, requestedShiftId: requestedShift._id });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/swaps/:id', () => {
  it('lets a manager accept a pending swap', async () => {
    const io = { emit: jest.fn() };
    app.set('io', io);

    const { manager, alice, bob, shift, requestedShift, swap } = await setupPendingSwap('accept');
    const res = await request(app)
      .patch(`/api/swaps/${swap._id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    expect(res.body.swap.status).toBe('accepted');
    expect(res.body.swap.resolvedBy).toBeTruthy();

    const [updatedOfferedShift, updatedRequestedShift] = await Promise.all([
      Shift.findById(shift._id),
      Shift.findById(requestedShift._id),
    ]);
    expect(updatedOfferedShift.assignedTo.toString()).toBe(bob.user.id);
    expect(updatedRequestedShift.assignedTo.toString()).toBe(alice.user.id);

    const updatedSwapEvent = io.emit.mock.calls.find(([event]) => event === 'swap:updated');
    const updatedShiftEvents = io.emit.mock.calls.filter(([event]) => event === 'shift:updated');
    expect(updatedSwapEvent[1].status).toBe('accepted');
    expect(updatedShiftEvents).toHaveLength(2);
    expect(updatedShiftEvents.map(([, updatedShift]) => updatedShift._id.toString())).toEqual(
      expect.arrayContaining([shift._id, requestedShift._id])
    );
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
});
