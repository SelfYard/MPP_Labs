const request = require('supertest');
const app = require('../app');
const db = require('../db');

beforeAll(() => {
  db.exec('DELETE FROM refresh_tokens; DELETE FROM password_resets; DELETE FROM books; DELETE FROM users;');
});

describe('auth + books', () => {
  const agent = request.agent(app);

  test('register / login / refresh / sessions / logout', async () => {
    const reg = await agent.post('/api/auth/register')
      .send({ email: 'a@b.co', password: 'password123' });
    expect(reg.status).toBe(201);
    expect(reg.body.accessToken).toBeTruthy();

    const dup = await agent.post('/api/auth/register')
      .send({ email: 'a@b.co', password: 'password123' });
    expect(dup.status).toBe(409);

    const bad = await agent.post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'wrong' });
    expect(bad.status).toBe(401);

    const login = await agent.post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'password123' });
    expect(login.status).toBe(200);
    const token = login.body.accessToken;

    const ref = await agent.post('/api/auth/refresh');
    expect(ref.status).toBe(200);
    expect(ref.body.accessToken).toBeTruthy();

    const sess = await agent.get('/api/auth/sessions')
      .set('Authorization', `Bearer ${ref.body.accessToken}`);
    expect(sess.status).toBe(200);
    expect(Array.isArray(sess.body)).toBe(true);

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    expect(token).toBeTruthy();
  });

  test('books requires auth', async () => {
    const r = await request(app).get('/api/books');
    expect(r.status).toBe(401);
    expect(r.headers['www-authenticate']).toMatch(/Bearer/);
  });

  test('books CRUD with auth', async () => {
    const reg = await agent.post('/api/auth/register')
      .send({ email: 'crud@b.co', password: 'password123' });
    const t = reg.body.accessToken;

    const created = await agent.post('/api/books')
      .set('Authorization', `Bearer ${t}`)
      .field('title', 'Test').field('author', 'Author');
    expect(created.status).toBe(201);

    const id = created.body.id;
    const got = await agent.get(`/api/books/${id}`).set('Authorization', `Bearer ${t}`);
    expect(got.status).toBe(200);

    const del = await agent.delete(`/api/books/${id}`).set('Authorization', `Bearer ${t}`);
    expect(del.status).toBe(204);

    const miss = await agent.get(`/api/books/${id}`).set('Authorization', `Bearer ${t}`);
    expect(miss.status).toBe(404);
  });
});