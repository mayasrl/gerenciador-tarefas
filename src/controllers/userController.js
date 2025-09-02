const User = require('../models/User');
const { query } = require('../config/database');

class UserController {
  // Listar todos os usuários (apenas admin)
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 50, role } = req.query;
      const offset = (page - 1) * limit;

      let users;
      if (role) {
        // Filtrar por role se especificado
        const result = await query(
          `SELECT id, name, email, role, created_at, updated_at 
           FROM users 
           WHERE role = $1
           ORDER BY created_at DESC 
           LIMIT $2 OFFSET $3`,
          [role, limit, offset]
        );
        users = result.rows.map(row => new User(row));
      } else {
        users = await User.findAll(limit, offset);
      }

      // Contar total de usuários para paginação
      const countResult = await query(
        role ? 'SELECT COUNT(*) FROM users WHERE role = $1' : 'SELECT COUNT(*) FROM users',
        role ? [role] : []
      );
      const total = parseInt(countResult.rows[0].count);

      res.json({
        users: users.map(user => user.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar usuários'
      });
    }
  }

  // Buscar usuário por ID (apenas admin)
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário especificado não existe'
        });
      }

      // Buscar informações adicionais
      const teams = await user.getTeams();
      const tasks = await user.getTasks();

      res.json({
        user: user.toJSON(),
        teams,
        tasks_count: tasks.length,
        recent_tasks: tasks.slice(0, 5)
      });

    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar usuário'
      });
    }
  }

  // Criar novo usuário (apenas admin)
  static async createUser(req, res) {
    try {
      const { name, email, password, role = 'member' } = req.body;

      // Validações básicas
      if (!name || !email || !password) {
        return res.status(400).json({
          error: 'Dados obrigatórios',
          message: 'Nome, email e senha são obrigatórios'
        });
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Email inválido',
          message: 'Formato de email inválido'
        });
      }

      // Validar força da senha
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Senha fraca',
          message: 'Senha deve ter pelo menos 6 caracteres'
        });
      }

      // Validar role
      if (!['admin', 'member'].includes(role)) {
        return res.status(400).json({
          error: 'Role inválida',
          message: 'Role deve ser "admin" ou "member"'
        });
      }

      // Criar usuário
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role
      });

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      
      if (error.message === 'Email já está em uso') {
        return res.status(409).json({
          error: 'Email já existe',
          message: 'Este email já está sendo usado por outro usuário'
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao criar usuário'
      });
    }
  }

  // Atualizar usuário (apenas admin)
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, password, role } = req.body;

      // Verificar se usuário existe
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário especificado não existe'
        });
      }

      const updates = {};

      // Validar e preparar atualizações
      if (name) {
        updates.name = name.trim();
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            error: 'Email inválido',
            message: 'Formato de email inválido'
          });
        }
        updates.email = email.toLowerCase().trim();
      }

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            error: 'Senha fraca',
            message: 'Senha deve ter pelo menos 6 caracteres'
          });
        }
        updates.password = password;
      }

      if (role) {
        if (!['admin', 'member'].includes(role)) {
          return res.status(400).json({
            error: 'Role inválida',
            message: 'Role deve ser "admin" ou "member"'
          });
        }
        updates.role = role;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Nenhum dado para atualizar',
          message: 'Forneça pelo menos um campo para atualizar'
        });
      }

      // Atualizar usuário
      const updatedUser = await User.update(id, updates);

      res.json({
        message: 'Usuário atualizado com sucesso',
        user: updatedUser.toJSON()
      });

    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      
      if (error.message === 'Email já está em uso') {
        return res.status(409).json({
          error: 'Email já existe',
          message: 'Este email já está sendo usado por outro usuário'
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao atualizar usuário'
      });
    }
  }

  // Deletar usuário (apenas admin)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Verificar se usuário existe
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário especificado não existe'
        });
      }

      // Não permitir que admin delete a si mesmo
      if (id === req.user.id) {
        return res.status(400).json({
          error: 'Operação não permitida',
          message: 'Você não pode deletar sua própria conta'
        });
      }

      // Deletar usuário
      const deleted = await User.delete(id);
      
      if (!deleted) {
        return res.status(500).json({
          error: 'Erro ao deletar',
          message: 'Não foi possível deletar o usuário'
        });
      }

      res.json({
        message: 'Usuário deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao deletar usuário'
      });
    }
  }

  // Buscar tarefas de um usuário (admin pode ver de qualquer usuário)
  static async getUserTasks(req, res) {
    try {
      const { id } = req.params;
      const { status, team_id, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      // Verificar se usuário existe
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário especificado não existe'
        });
      }

      // Buscar tarefas do usuário
      const tasks = await user.getTasks(status);
      
      // Filtrar por team_id se especificado
      let filteredTasks = tasks;
      if (team_id) {
        filteredTasks = tasks.filter(task => task.team_id === team_id);
      }

      // Aplicar paginação
      const paginatedTasks = filteredTasks.slice(offset, offset + parseInt(limit));

      res.json({
        user: user.toJSON(),
        tasks: paginatedTasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredTasks.length,
          pages: Math.ceil(filteredTasks.length / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao buscar tarefas do usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar tarefas do usuário'
      });
    }
  }

  // Buscar times de um usuário (admin pode ver de qualquer usuário)
  static async getUserTeams(req, res) {
    try {
      const { id } = req.params;

      // Verificar se usuário existe
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário especificado não existe'
        });
      }

      // Buscar times do usuário
      const teams = await user.getTeams();

      res.json({
        user: user.toJSON(),
        teams
      });

    } catch (error) {
      console.error('Erro ao buscar times do usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar times do usuário'
      });
    }
  }
}

module.exports = UserController;

