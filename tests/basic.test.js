const request = require('supertest');
const app = require('../src/app');

describe('Testes Básicos', () => {
  describe('GET /', () => {
    it('deve retornar informações da API', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'API Gerenciador de Tarefas');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /health', () => {
    it('deve retornar status de saúde da API', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /rota-inexistente', () => {
    it('deve retornar erro 404 para rota não encontrada', async () => {
      const response = await request(app).get('/rota-inexistente');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Rota não encontrada');
    });
  });
});

