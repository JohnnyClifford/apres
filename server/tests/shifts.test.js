const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Shift = require('../src/models/Shift');

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

async function createShift(token, overrides = {}) {
  const payload = {
    venue: 'Test Venue',
    date: '2026-11-02',
    startTime: '09:00',
    endTime: '17:00',
    role: 'staff',
    ...overrides,
  };
  return request(app)
    .post('/api/shifts')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
}

// Clean up the test data after all tests run
afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@example\.com$/ } });
  await Shift.deleteMany({ venue: { $in: ['Test Venue', 'A', 'B'] } });
});

describe('POST /api/shifts', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/shifts').send({});
    expect(res.status).toBe(401);
  });

  it('rejects staff', async () => {
    const { token } = await registerUser({ email: 'staff@example.com' });
    const res = await createShift(token);
    expect(res.status).toBe(403);
  });

  it('creates a shift for a manager', async () => {
    const { token } = await registerUser({ email: 'mgr@example.com', role: 'manager' });
    const res = await createShift(token);
    expect(res.status).toBe(201);
    expect(res.body.shift.venue).toBe('Test Venue');
    expect(res.body.shift.status).toBe('draft');
  });

  it('rejects missing required fields', async () => {
    const { token } = await registerUser({ email: 'mgr2@example.com', role: 'manager' });
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({ venue: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects a shift that conflicts with an existing assignment', async () => {
    const { token } = await registerUser({ email: 'mgr3@example.com', role: 'manager' });
    const assignedUserId = '507f1f77bcf86cd799439011';

    const first = await createShift(token, { assignedTo: assignedUserId });
    expect(first.status).toBe(201);

    const second = await createShift(token, {
      startTime: '10:00',
      endTime: '14:00',
      assignedTo: assignedUserId,
    });
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/conflict/i);
  });

  it('allows adjacent shifts that do not overlap', async () => {
    const { token } = await registerUser({ email: 'mgr4@example.com', role: 'manager' });
    const assignedUserId = '507f1f77bcf86cd799439012';

    await createShift(token, { startTime: '09:00', endTime: '13:00', assignedTo: assignedUserId });
    const second = await createShift(token, {
      startTime: '13:00',
      endTime: '17:00',
      assignedTo: assignedUserId,
    });
    expect(second.status).toBe(201);
  });
});

describe('GET /api/shifts', () => {
  it('filters by venue', async () => {
    const { token } = await registerUser({ email: 'getter@example.com', role: 'manager' });
    await createShift(token, { venue: 'A' });
    await createShift(token, { venue: 'B' });

    const res = await request(app)
      .get('/api/shifts?venue=A')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.shifts).toHaveLength(1);
    expect(res.body.shifts[0].venue).toBe('A');
  });

  it('filters by date range', async () => {
    const { token } = await registerUser({ email: 'ranger@example.com', role: 'manager' });
    await createShift(token, { date: '2026-11-01' });
    await createShift(token, { date: '2026-11-15' });
    await createShift(token, { date: '2026-12-01' });

    const res = await request(app)
      .get('/api/shifts?from=2026-11-01&to=2026-11-30')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.shifts).toHaveLength(2);
  });
});

describe('PATCH /api/shifts/:id', () => {
  it('updates a shift', async () => {
    const { token } = await registerUser({ email: 'patcher@example.com', role: 'manager' });
    const created = await createShift(token);
    
    // FIX: Extract the ID from the created shift correctly
    const id = created.body.shift._id;

    const res = await request(app)
      .patch(`/api/shifts/${id}`) // FIX: Use 'id' here instead of 'shiftId'
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Bring extra napkins' });
      
    expect(res.status).toBe(200);
    expect(res.body.shift.notes).toBe('Bring extra napkins');
  });

  it('returns 404 for unknown id', async () => {
    const { token } = await registerUser({ email: 'patch404@example.com', role: 'manager' });
    const res = await request(app)
      .patch('/api/shifts/507f1f77bcf86cd799439099')
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'nope' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/shifts/:id', () => {
  it('deletes a shift', async () => {
    const { token } = await registerUser({ email: 'deleter@example.com', role: 'manager' });
    const created = await createShift(token);
    const id = created.body.shift._id;

    const del = await request(app)
      .delete(`/api/shifts/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get('/api/shifts')
      .set('Authorization', `Bearer ${token}`);
    expect(get.body.shifts).toHaveLength(0);
  });
});