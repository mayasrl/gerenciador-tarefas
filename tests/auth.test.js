const request = require('supertest');
const app = require('../src/app');
const { mockQuery } = require('./setup');
const bcrypt = require('bcrypt');

describe('Autenticação', () => {
  describe('POST /api/auth/register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const userData = {
        name: 'João Silva',
        email: 'joao@teste.com',
        password: 'senha123'
      };

      // Mock da query de inserção
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: userData.name,
          email: userData.email,
          role: 'member',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Usuário criado com sucesso');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('deve retornar erro para email inválido', async () => {
      const userData = {
        name: 'João Silva',
        email: 'email-invalido',
        password: 'senha123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email inválido');
    });

    it('deve retornar erro para senha muito curta', async () => {
      const userData = {
        name: 'João Silva',
        email: 'joao@teste.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Senha fraca');
    });

    it('deve retornar erro para dados obrigatórios ausentes', async () => {
      const userData = {
        email: 'joao@teste.com'
        // name e password ausentes
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Dados obrigatórios');
    });
  });

  describe('POST /api/auth/login', () => {
    it('deve fazer login com sucesso', async () => {
      const loginData = {
        email: 'joao@teste.com',
        password: 'senha123'
      };

      const hashedPassword = await bcrypt.hash('senha123', 12);

      // Mock da query de busca por email
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'João Silva',
          email: 'joao@teste.com',
          password_hash: hashedPassword,
          role: 'member',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login realizado com sucesso');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('deve retornar erro para email não encontrado', async () => {
      const loginData = {
        email: 'naoexiste@teste.com',
        password: 'senha123'
      };

      // Mock da query retornando usuário não encontrado
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
    });

    it('deve retornar erro para senha incorreta', async () => {
      const loginData = {
        email: 'joao@teste.com',
        password: 'senhaerrada'
      };

      const hashedPassword = await bcrypt.hash('senha123', 12);

      // Mock da query de busca por email
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'João Silva',
          email: 'joao@teste.com',
          password_hash: hashedPassword,
          role: 'member',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
    });

    it('deve retornar erro para dados obrigatórios ausentes', async () => {
      const loginData = {
        email: 'joao@teste.com'
        // password ausente
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Dados obrigatórios');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('deve retornar perfil do usuário autenticado', async () => {
      // Primeiro fazer login para obter token
      const loginData = {
        email: 'joao@teste.com',
        password: 'senha123'
      };

      const hashedPassword = await bcrypt.hash('senha123', 12);
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock para login
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: userId,
          name: 'João Silva',
          email: 'joao@teste.com',
          password_hash: hashedPassword,
          role: 'member',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const token = loginResponse.body.token;

      // Mock para buscar perfil
      mockQuery
        .mockResolvedValueOnce({ // findById
          rows: [{
            id: userId,
            name: 'João Silva',
            email: 'joao@teste.com',
            role: 'member',
            created_at: new Date(),
            updated_at: new Date()
          }]
        })
        .mockResolvedValueOnce({ // getTeams
          rows: []
        })
        .mockResolvedValueOnce({ // getTasks
          rows: []
        });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('joao@teste.com');
      expect(response.body).toHaveProperty('teams');
      expect(response.body).toHaveProperty('tasks_count');
    });

    it('deve retornar erro para token ausente', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token de acesso requerido');
    });

    it('deve retornar erro para token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer token-invalido');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });
  });
});

