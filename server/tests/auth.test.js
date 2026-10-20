const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { createApp } = require('../src/app');
const User = require('../src/models/User');

describe('Auth & RBAC API', () => {
  const app = createApp();

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  beforeEach(async () => {
    await User.deleteMany({ 
      email: { $in: ['test@example.com', 'login@example.com', 'me@example.com', 'staff@example.com', 'manager@example.com'] } 
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('creates a user and returns a token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123', name: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('staff');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejects missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
      expect(res.status).toBe(400);
    });

    it('rejects short passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com', password: 'short', name: 'A' });
      expect(res.status).toBe(400);
    });

    it('rejects duplicate emails', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123', name: 'First' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123', name: 'Second' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login@example.com', password: 'password123', name: 'Login User' });
    });

    it('returns a token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'me@example.com', password: 'password123', name: 'Me' });
      token = res.body.token;
    });

    it('returns the current user with a valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('me@example.com');
    });

    it('rejects requests without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects malformed tokens', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC on /api/shifts', () => {
    let staffToken;
    let managerToken;

    beforeEach(async () => {
      const staffRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'staff@example.com', password: 'password123', name: 'Staff' });
      staffToken = staffRes.body.token;

      const passwordHash = await bcrypt.hash('password123', 10);
      const manager = await User.create({ 
        email: 'manager@example.com', 
        passwordHash, 
        name: 'Manager', 
        role: 'manager' 
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'manager@example.com', password: 'password123' });
      managerToken = loginRes.body.token;
    });

    it('blocks a staff user from creating a shift (403)', async () => {
      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ venue: 'Main', date: '2026-10-25', startTime: '18:00', endTime: '23:00' });
      
      expect(res.status).toBe(403);
    });

    it('allows a manager to create a shift (201)', async () => {
      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ venue: 'Main', date: '2026-10-25', startTime: '18:00', endTime: '23:00' });
      
      expect(res.status).toBe(201);
    });
  });
});