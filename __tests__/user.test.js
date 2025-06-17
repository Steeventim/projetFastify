const request = require('supertest');
const fastify = require('fastify');

// Tests exemple pour userController
describe('User Controller', () => {
  let app;

  beforeAll(async () => {
    app = fastify();
    // Setup your routes here
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app.server)
        .post('/users/login')
        .send({
          Email: 'test@example.com',
          Password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app.server)
        .post('/users/login')
        .send({
          Email: 'test@example.com',
          Password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });
  });
});
