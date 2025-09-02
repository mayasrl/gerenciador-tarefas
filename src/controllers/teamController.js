const Team = require('../models/Team');
const User = require('../models/User');
const { query } = require('../config/database');

class TeamController {
  // Listar todos os times
  static async getAllTeams(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      let teams;
      
      if (req.user.role === 'admin') {
        // Admin pode ver todos os times
        teams = await Team.findAll(limit, offset);
      } else {
        // Membros só veem seus times
        teams = await Team.findByUserId(req.user.id);
      }

      // Contar total para paginação (apenas para admin)
      let total = teams.length;
      if (req.user.role === 'admin') {
        const countResult = await query('SELECT COUNT(*) FROM teams');
        total = parseInt(countResult.rows[0].count);
      }

      res.json({
        teams,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar times:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar times'
      });
    }
  }

  // Buscar time por ID
  static async getTeamById(req, res) {
    try {
      const { id } = req.params;

      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({
          error: 'Time não encontrado',
          message: 'O time especificado não existe'
        });
      }

      // Verificar se usuário tem acesso ao time
      if (req.user.role !== 'admin') {
        const isMember = await team.isMember(req.user.id);
        if (!isMember) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem acesso a este time'
          });
        }
      }

      // Buscar informações adicionais
      const members = await team.getMembers();
      const tasks = await team.getTasks();
      const stats = await team.getStats();

      res.json({
        team,
        members,
        tasks_count: tasks.length,
        recent_tasks: tasks.slice(0, 5),
        stats
      });

    } catch (error) {
      console.error('Erro ao buscar time:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar time'
      });
    }
  }

  // Criar novo time (apenas admin)
  static async createTeam(req, res) {
    try {
      const { name, description } = req.body;

      // Validações básicas
      if (!name) {
        return res.status(400).json({
          error: 'Nome obrigatório',
          message: 'Nome do time é obrigatório'
        });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({
          error: 'Nome muito curto',
          message: 'Nome do time deve ter pelo menos 2 caracteres'
        });
      }

      // Criar time
      const team = await Team.create({
        name: name.trim(),
        description: description ? description.trim() : null,
        created_by: req.user.id
      });

      res.status(201).json({
        message: 'Time criado com sucesso',
        team
      });

    } catch (error) {
      console.error('Erro ao criar time:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao criar time'
      });
    }
  }

  // Atualizar time (apenas admin)
  static async updateTeam(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Verificar se time existe
      const existingTeam = await Team.findById(id);
      if (!existingTeam) {
        return res.status(404).json({
          error: 'Time não encontrado',
          message: 'O time especificado não existe'
        });
      }

      const updates = {};

      // Validar e preparar atualizações
      if (name) {
        if (name.trim().length < 2) {
          return res.status(400).json({
            error: 'Nome muito curto',
            message: 'Nome do time deve ter pelo menos 2 caracteres'
          });
        }
        updates.name = name.trim();
      }

      if (description !== undefined) {
        updates.description = description ? description.trim() : null;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Nenhum dado para atualizar',
          message: 'Forneça pelo menos um campo para atualizar'
        });
      }

      // Atualizar time
      const updatedTeam = await Team.update(id, updates);

      res.json({
        message: 'Time atualizado com sucesso',
        team: updatedTeam
      });

    } catch (error) {
      console.error('Erro ao atualizar time:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao atualizar time'
      });
    }
  }

  // Deletar time (apenas admin)
  static async deleteTeam(req, res) {
    try {
      const { id } = req.params;

      // Verificar se time existe
      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({
          error: 'Time não encontrado',
          message: 'O time especificado não existe'
        });
      }

      // Verificar se time tem tarefas ativas
      const tasks = await team.getTasks();
      const activeTasks = tasks.filter(task => task.status !== 'Concluído');
      
      if (activeTasks.length > 0) {
        return res.status(400).json({
          error: 'Time possui tarefas ativas',
          message: `O time possui ${activeTasks.length} tarefa(s) ativa(s). Conclua ou reatribua as tarefas antes de deletar o time.`
        });
      }

      // Deletar time
      const deleted = await Team.delete(id);
      
      if (!deleted) {
        return res.status(500).json({
          error: 'Erro ao deletar',
          message: 'Não foi possível deletar o time'
        });
      }

      res.json({
        message: 'Time deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar time:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao deletar time'
      });
    }
  }

  // Adicionar membro ao time (apenas admin)
  static async addMember(req, res) {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          error: 'ID do usuário obrigatório',
          message: 'ID do usuário é obrigatório'
        });
      }

      // Verificar se time existe
      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({
          error: 'Time não encontrado',
          message: 'O time especificado não existe'
        });
      }

      // Verificar se usuário existe
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário especificado não existe'
        });
      }

      // Verificar se usuário já é membro
      const isMember = await team.isMember(user_id);
      if (isMember) {
        return res.status(409).json({
          error: 'Usuário já é membro',
          message: 'O usuário já é membro deste time'
        });
      }

      // Adicionar membro
      await team.addMember(user_id);

      res.json({
        message: 'Membro adicionado com sucesso',
        team_id: id,
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao adicionar membro ao time'
      });
    }
  }

  // Remover membro do time (apenas admin)
  static async removeMember(req, res) {
    try {
      const { id, userId } = req.params;

      // Verificar se time existe
      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({
          error: 'Time não encontrado',
          message: 'O time especificado não existe'
        });
      }

      // Verificar se usuário é membro
      const isMember = await team.isMember(userId);
      if (!isMember) {
        return res.status(404).json({
          error: 'Usuário não é membro',
          message: 'O usuário não é membro deste time'
        });
      }

      // Verificar se usuário tem tarefas ativas no time
      const tasks = await team.getTasks(null, userId);
      const activeTasks = tasks.filter(task => task.status !== 'Concluído');
      
      if (activeTasks.length > 0) {
        return res.status(400).json({
          error: 'Usuário possui tarefas ativas',
          message: `O usuário possui ${activeTasks.length} tarefa(s) ativa(s) neste time. Reatribua as tarefas antes de remover o membro.`
        });
      }

      // Remover membro
      const removed = await team.removeMember(userId);
      
      if (!removed) {
        return res.status(500).json({
          error: 'Erro ao remover',
          message: 'Não foi possível remover o membro do time'
        });
      }

      res.json({
        message: 'Membro removido com sucesso'
      });

    } catch (error) {
      console.error('Erro ao remover membro:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao remover membro do time'
      });
    }
  }

  // Listar membros do time
  static async getTeamMembers(req, res) {
    try {
      const { id } = req.params;

      // Verificar se time existe
      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({
          error: 'Time não encontrado',
          message: 'O time especificado não existe'
        });
      }

      // Verificar se usuário tem acesso ao time
      if (req.user.role !== 'admin') {
        const isMember = await team.isMember(req.user.id);
        if (!isMember) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem acesso a este time'
          });
        }
      }

      // Buscar membros
      const members = await team.getMembers();

      res.json({
        team: {
          id: team.id,
          name: team.name,
          description: team.description
        },
        members
      });

    } catch (error) {
      console.error('Erro ao buscar membros do time:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar membros do time'
      });
    }
  }

  // Buscar tarefas do time
  static async getTeamTasks(req, res) {
    try {
      const { id } = req.params;
      const { status, assigned_to, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      // Verificar se time existe
      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({
          error: 'Time não encontrado',
          message: 'O time especificado não existe'
        });
      }

      // Verificar se usuário tem acesso ao time
      if (req.user.role !== 'admin') {
        const isMember = await team.isMember(req.user.id);
        if (!isMember) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem acesso a este time'
          });
        }
      }

      // Buscar tarefas do time
      const allTasks = await team.getTasks(status, assigned_to);
      
      // Aplicar paginação
      const tasks = allTasks.slice(offset, offset + parseInt(limit));

      res.json({
        team: {
          id: team.id,
          name: team.name,
          description: team.description
        },
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allTasks.length,
          pages: Math.ceil(allTasks.length / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao buscar tarefas do time:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar tarefas do time'
      });
    }
  }

  // Estatísticas do time
  static async getTeamStats(req, res) {
    try {
      const { id } = req.params;

      // Verificar se time existe
      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({
          error: 'Time não encontrado',
          message: 'O time especificado não existe'
        });
      }

      // Verificar se usuário tem acesso ao time
      if (req.user.role !== 'admin') {
        const isMember = await team.isMember(req.user.id);
        if (!isMember) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem acesso a este time'
          });
        }
      }

      // Buscar estatísticas
      const stats = await team.getStats();
      const members = await team.getMembers();

      res.json({
        team: {
          id: team.id,
          name: team.name,
          description: team.description
        },
        stats: {
          ...stats,
          total_members: members.length
        }
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas do time:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar estatísticas do time'
      });
    }
  }
}

module.exports = TeamController;

