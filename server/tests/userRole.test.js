const request = require('supertest');
const bcrypt = require('bcrypt');
const { createApp } = require('../src/app');
const User = require('../src/models/User');

describe('PATCH /api/auth/users/:id/role', () => {
  const app = createApp();

  async function registerUser({ email, name, role = 'staff' }) {
    const password = 'password123';
    if (role === 'staff') {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email, password, name });
      return { user: response.body.user, token: response.body.token };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, name, passwordHash, role });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    return { user, token: response.body.token };
  }

  it('rejects a role change from staff', async () => {
    const staff = await registerUser({ email: 'staff-role@example.com', name: 'Staff' });
    const target = await registerUser({ email: 'target-role@example.com', name: 'Target' });

    const response = await request(app)
      .patch(`/api/auth/users/${target.user.id || target.user._id}/role`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ role: 'manager' });

    expect(response.status).toBe(403);
  });

  it('rejects a role change from manager', async () => {
    const manager = await registerUser({ email: 'manager-role@example.com', name: 'Manager', role: 'manager' });
    const target = await registerUser({ email: 'target-role@example.com', name: 'Target' });

    const response = await request(app)
      .patch(`/api/auth/users/${target.user.id || target.user._id}/role`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ role: 'owner' });

    expect(response.status).toBe(403);
  });

  it('rejects an invalid role string', async () => {
    const owner = await registerUser({ email: 'owner-invalid@example.com', name: 'Owner', role: 'owner' });
    const target = await registerUser({ email: 'target-invalid@example.com', name: 'Target' });

    const response = await request(app)
      .patch(`/api/auth/users/${target.user.id || target.user._id}/role`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'admin' });

    expect(response.status).toBe(400);
  });

  it('rejects an owner trying to change their own role', async () => {
    const owner = await registerUser({ email: 'owner-self@example.com', name: 'Owner', role: 'owner' });
    const ownerId = owner.user.id || owner.user._id;

    const response = await request(app)
      .patch(`/api/auth/users/${ownerId}/role`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'manager' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('You cannot change your own role');
  });

  it('allows an owner to promote a staff user to manager', async () => {
    const owner = await registerUser({ email: 'owner-promote@example.com', name: 'Owner', role: 'owner' });
    const staff = await registerUser({ email: 'staff-promote@example.com', name: 'Staff' });

    const response = await request(app)
      .patch(`/api/auth/users/${staff.user.id || staff.user._id}/role`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'manager' });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('manager');
    expect(response.body.user.passwordHash).toBeUndefined();
  });
});
