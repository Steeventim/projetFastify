const request = require('supertest');
const fastify = require('fastify');

// Mocks: we mock models, authMiddleware and bcrypt so tests run isolated from DB
jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn()
  },
  Role: {
    findOrCreate: jest.fn()
  },
  Permission: {},
  UserRoles: {
    create: jest.fn()
  }
}));

jest.mock('../middleware/authMiddleware', () => ({
  generateToken: jest.fn(() => Promise.resolve('fake-token')),
  verifyToken: jest.fn(),
  requireRole: () => (req, reply, done) => done()
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn()
}));

const { User } = require('../models');
const bcrypt = require('bcrypt');

// Tests exemple pour userController
describe('User Controller', () => {
  let app;

  beforeAll(async () => {
    app = fastify();
    // register routes so the endpoint exists on the instance used by supertest
    const userRoutes = require('../routes/userRoutes');
    await app.register(userRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /users/login', () => {
    test('should login with valid credentials', async () => {
      // Arrange: mock DB lookup and password check
      const mockUser = {
        idUser: '1111-2222',
        Email: 'test@example.com',
        Password: 'hashed',
        Roles: [{ idRole: 'r1', name: 'user', description: '', isSystemRole: false, permissions: [] }],
        update: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const response = await request(app.server)
        .post('/users/login')
        .send({
          Email: 'test@example.com',
          Password: 'Test123!@#'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    test('should reject invalid credentials', async () => {
      User.findOne.mockResolvedValue({
        idUser: '1111-2222',
        Email: 'test@example.com',
        Password: 'hashed',
        Roles: []
      });
      bcrypt.compare.mockResolvedValue(false);

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
