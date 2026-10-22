const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Settings = require('../src/models/Settings');

const app = createApp();

async function registerUser({ email, name = 'Test User', role = 'staff' }) {
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

describe('/api/settings', () => {
  it('creates and returns default settings with GET', async () => {
    const { token } = await registerUser({ email: 'settings-get@test.com' });

    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.settings.venueName).toBe('Main Restaurant');
    expect(await Settings.countDocuments()).toBe(1);
  });

  it('rejects PUT from staff', async () => {
    const { token } = await registerUser({ email: 'settings-staff@test.com' });

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ venueName: 'Staff Venue' });

    expect(res.status).toBe(403);
  });

  it('rejects PUT from manager', async () => {
    const { token } = await registerUser({ email: 'settings-manager@test.com', role: 'manager' });

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ venueName: 'Manager Venue' });

    expect(res.status).toBe(403);
  });

  it('allows an owner to update venueName', async () => {
    const { token } = await registerUser({ email: 'settings-owner@test.com', role: 'owner' });

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ venueName: 'Harbour Bistro' });

    expect(res.status).toBe(200);
    expect(res.body.settings.venueName).toBe('Harbour Bistro');
    expect((await Settings.findOne()).venueName).toBe('Harbour Bistro');
  });
});
