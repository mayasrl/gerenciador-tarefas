const request = require('supertest');
const app = require('../src/app');
const { mockQuery } = require('./setup');
const { generateToken } = require('../src/middleware/auth');

describe('Tarefas', () => {
  let adminToken, memberToken;
  const adminUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'admin@teste.com',
    role: 'admin'
  };
  const memberUser = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'member@teste.com',
    role: 'member'
  };

  beforeAll(() => {
    adminToken = generateToken(adminUser);
    memberToken = generateToken(memberUser);
  });

  describe('POST /api/tasks', () => {
    it('deve criar uma nova tarefa com sucesso', async () => {
      const taskData = {
        title: 'Nova Tarefa',
        description: 'Descrição da tarefa',
        team_id: '123e4567-e89b-12d3-a456-426614174002',
        assigned_to: memberUser.id,
        priority: 'Alta'
      };

      // Mock para verificar se time existe
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: taskData.team_id,
          name: 'Time Teste',
          description: 'Time para testes',
          created_by: adminUser.id
        }]
      });

      // Mock para verificar se usuário é membro do time
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }]
      });

      // Mock para verificar se usuário atribuído existe
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: memberUser.id,
          name: 'Membro Teste',
          email: memberUser.email,
          role: memberUser.role
        }]
      });

      // Mock para verificar se usuário atribuído é membro do time
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }]
      });

      // Mock para criar tarefa
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174003',
          title: taskData.title,
          description: taskData.description,
          status: 'Pendente',
          priority: taskData.priority,
          assigned_to: taskData.assigned_to,
          team_id: taskData.team_id,
          created_by: adminUser.id,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      // Mock para criar histórico
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174004',
          task_id: '123e4567-e89b-12d3-a456-426614174003',
          changed_by: adminUser.id,
          field_changed: 'created',
          new_value: 'Tarefa criada',
          changed_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Tarefa criada com sucesso');
      expect(response.body).toHaveProperty('task');
      expect(response.body.task.title).toBe(taskData.title);
    });

    it('deve retornar erro para dados obrigatórios ausentes', async () => {
      const taskData = {
        description: 'Descrição da tarefa'
        // title e team_id ausentes
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Dados obrigatórios');
    });

    it('deve retornar erro para título muito curto', async () => {
      const taskData = {
        title: 'AB',
        team_id: '123e4567-e89b-12d3-a456-426614174002'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Título muito curto');
    });

    it('deve retornar erro para status inválido', async () => {
      const taskData = {
        title: 'Nova Tarefa',
        team_id: '123e4567-e89b-12d3-a456-426614174002',
        status: 'Status Inválido'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Status inválido');
    });

    it('deve retornar erro para time não encontrado', async () => {
      const taskData = {
        title: 'Nova Tarefa',
        team_id: '123e4567-e89b-12d3-a456-426614174999'
      };

      // Mock para time não encontrado
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Time não encontrado');
    });
  });

  describe('GET /api/tasks', () => {
    it('deve listar tarefas para admin', async () => {
      // Mock para buscar usuário admin
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: adminUser.id,
          name: 'Admin',
          email: adminUser.email,
          role: adminUser.role
        }]
      });

      // Mock para listar tarefas (admin vê todas)
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174003',
          title: 'Tarefa 1',
          description: 'Descrição 1',
          status: 'Pendente',
          priority: 'Alta',
          assigned_to: memberUser.id,
          team_id: '123e4567-e89b-12d3-a456-426614174002',
          created_by: adminUser.id,
          created_at: new Date(),
          updated_at: new Date(),
          assigned_to_name: 'Membro Teste',
          created_by_name: 'Admin',
          team_name: 'Time Teste'
        }]
      });

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });

    it('deve retornar erro para usuário não autenticado', async () => {
      const response = await request(app)
        .get('/api/tasks');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token de acesso requerido');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('deve atualizar tarefa com sucesso', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174003';
      const updateData = {
        title: 'Tarefa Atualizada',
        status: 'Em progresso'
      };

      // Mock para buscar tarefa
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: taskId,
          title: 'Tarefa Original',
          description: 'Descrição',
          status: 'Pendente',
          priority: 'Alta',
          assigned_to: memberUser.id,
          team_id: '123e4567-e89b-12d3-a456-426614174002',
          created_by: adminUser.id,
          created_at: new Date(),
          updated_at: new Date(),
          assigned_to_name: 'Membro Teste',
          created_by_name: 'Admin',
          team_name: 'Time Teste'
        }]
      });

      // Mock para buscar usuário admin
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: adminUser.id,
          name: 'Admin',
          email: adminUser.email,
          role: adminUser.role
        }]
      });

      // Mock para criar histórico (título)
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174005',
          task_id: taskId,
          changed_by: adminUser.id,
          field_changed: 'title',
          old_value: 'Tarefa Original',
          new_value: updateData.title,
          changed_at: new Date()
        }]
      });

      // Mock para criar histórico (status)
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174006',
          task_id: taskId,
          changed_by: adminUser.id,
          field_changed: 'status',
          old_value: 'Pendente',
          new_value: updateData.status,
          changed_at: new Date()
        }]
      });

      // Mock para atualizar tarefa
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: taskId,
          title: updateData.title,
          description: 'Descrição',
          status: updateData.status,
          priority: 'Alta',
          assigned_to: memberUser.id,
          team_id: '123e4567-e89b-12d3-a456-426614174002',
          created_by: adminUser.id,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Tarefa atualizada com sucesso');
      expect(response.body).toHaveProperty('task');
    });

    it('deve retornar erro para tarefa não encontrada', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174999';
      const updateData = {
        title: 'Tarefa Atualizada'
      };

      // Mock para tarefa não encontrada
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Tarefa não encontrada');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deve deletar tarefa com sucesso (admin)', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174003';

      // Mock para buscar tarefa
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: taskId,
          title: 'Tarefa para Deletar',
          description: 'Descrição',
          status: 'Pendente',
          priority: 'Alta',
          assigned_to: memberUser.id,
          team_id: '123e4567-e89b-12d3-a456-426614174002',
          created_by: adminUser.id,
          created_at: new Date(),
          updated_at: new Date(),
          assigned_to_name: 'Membro Teste',
          created_by_name: 'Admin',
          team_name: 'Time Teste'
        }]
      });

      // Mock para buscar usuário admin
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: adminUser.id,
          name: 'Admin',
          email: adminUser.email,
          role: adminUser.role
        }]
      });

      // Mock para deletar tarefa
      mockQuery.mockResolvedValueOnce({
        rowCount: 1
      });

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Tarefa deletada com sucesso');
    });

    it('deve retornar erro para tarefa não encontrada', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174999';

      // Mock para tarefa não encontrada
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Tarefa não encontrada');
    });
  });
});

