// Configuração global para testes
require('dotenv').config({ path: '.env.test' });

// Mock do banco de dados para testes
const mockQuery = jest.fn();
const mockTransaction = jest.fn();
const mockTestConnection = jest.fn().mockResolvedValue(true);
const mockInitializeDatabase = jest.fn().mockResolvedValue(true);

jest.mock('../src/config/database', () => ({
  query: mockQuery,
  transaction: mockTransaction,
  testConnection: mockTestConnection,
  initializeDatabase: mockInitializeDatabase
}));

// Configurar timeout para testes
jest.setTimeout(10000);

// Limpar mocks antes de cada teste
beforeEach(() => {
  jest.clearAllMocks();
});

module.exports = {
  mockQuery,
  mockTransaction,
  mockTestConnection,
  mockInitializeDatabase
};

