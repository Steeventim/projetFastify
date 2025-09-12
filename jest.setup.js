// Minimal Jest setup for projetFastify tests
// Provide any global mocks/setup needed by tests
jest.setTimeout(20000);

// Mock global._io if used by controllers
global._io = { to: () => ({ emit: () => {} }) };

// Mock dotenv to avoid requiring real env
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
