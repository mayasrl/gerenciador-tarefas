const Task = require('../models/Task');
const Team = require('../models/Team');
const User = require('../models/User');
const TaskHistory = require('../models/TaskHistory');

class TaskController {
  // Listar tarefas
  static async getAllTasks(req, res) {
    try {
      const { 
        status, 
        priority, 
        assigned_to, 
        team_id, 
        created_by, 
        page = 1, 
        limit = 50 
      } = req.query;
      
      const offset = (page - 1) * limit;
      const filters = { status, priority, assigned_to, team_id, created_by, limit, offset };

      let tasks;
      
      if (req.user.role === 'admin') {
        // Admin pode ver todas as tarefas
        tasks = await Task.findAll(filters);
      } else {
        // Membros só veem tarefas dos seus times ou atribuídas a eles
        const userTeams = await req.user.getTeams();
        const teamIds = userTeams.map(team => team.id);
        
        if (teamIds.length === 0) {
          // Se não pertence a nenhum time, só vê suas próprias tarefas
          tasks = await Task.findByUserId(req.user.id, { status, team_id, limit, offset });
        } else {
          // Buscar tarefas dos times do usuário ou atribuídas a ele
          const allTasks = [];
          for (const teamId of teamIds) {
            const teamTasks = await Task.findAll({ ...filters, team_id: teamId });
            allTasks.push(...teamTasks);
          }
          
          // Adicionar tarefas atribuídas ao usuário (se não estiverem já incluídas)
          const userTasks = await Task.findByUserId(req.user.id, { status, team_id, limit, offset });
          for (const task of userTasks) {
            if (!allTasks.find(t => t.id === task.id)) {
              allTasks.push(task);
            }
          }
          
          // Aplicar paginação
          tasks = allTasks.slice(offset, offset + parseInt(limit));
        }
      }

      res.json({
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tasks.length
        }
      });

    } catch (error) {
      console.error('Erro ao listar tarefas:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar tarefas'
      });
    }
  }

  // Buscar tarefa por ID
  static async getTaskById(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({
          error: 'Tarefa não encontrada',
          message: 'A tarefa especificada não existe'
        });
      }

      // Verificar se usuário tem acesso à tarefa
      if (req.user.role !== 'admin') {
        const team = await Team.findById(task.team_id);
        const isMember = await team.isMember(req.user.id);
        
        if (!isMember && task.assigned_to !== req.user.id && task.created_by !== req.user.id) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem acesso a esta tarefa'
          });
        }
      }

      // Buscar histórico da tarefa
      const history = await task.getHistory();

      res.json({
        task,
        history,
        can_edit: task.canEdit(req.user.id, req.user.role),
        is_overdue: task.isOverdue(),
        days_remaining: task.getDaysRemaining()
      });

    } catch (error) {
      console.error('Erro ao buscar tarefa:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar tarefa'
      });
    }
  }

  // Criar nova tarefa
  static async createTask(req, res) {
    try {
      const { 
        title, 
        description, 
        status = 'Pendente', 
        priority = 'Média', 
        assigned_to, 
        team_id, 
        due_date 
      } = req.body;

      // Validações básicas
      if (!title || !team_id) {
        return res.status(400).json({
          error: 'Dados obrigatórios',
          message: 'Título e ID do time são obrigatórios'
        });
      }

      if (title.trim().length < 3) {
        return res.status(400).json({
          error: 'Título muito curto',
          message: 'Título deve ter pelo menos 3 caracteres'
        });
      }

      // Validar status
      const validStatuses = ['Pendente', 'Em progresso', 'Concluído'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Status inválido',
          message: 'Status deve ser: Pendente, Em progresso ou Concluído'
        });
      }

      // Validar prioridade
      const validPriorities = ['Alta', 'Média', 'Baixa'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          error: 'Prioridade inválida',
          message: 'Prioridade deve ser: Alta, Média ou Baixa'
        });
      }

      // Verificar se time existe
      const team = await Team.findById(team_id);
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
            message: 'Você não é membro deste time'
          });
        }
      }

      // Verificar se usuário atribuído existe e é membro do time
      if (assigned_to) {
        const assignedUser = await User.findById(assigned_to);
        if (!assignedUser) {
          return res.status(404).json({
            error: 'Usuário não encontrado',
            message: 'O usuário a ser atribuído não existe'
          });
        }

        const isAssignedUserMember = await team.isMember(assigned_to);
        if (!isAssignedUserMember && req.user.role !== 'admin') {
          return res.status(400).json({
            error: 'Usuário não é membro do time',
            message: 'O usuário atribuído deve ser membro do time'
          });
        }
      }

      // Validar data de vencimento
      if (due_date) {
        const dueDate = new Date(due_date);
        if (isNaN(dueDate.getTime())) {
          return res.status(400).json({
            error: 'Data inválida',
            message: 'Formato de data de vencimento inválido'
          });
        }
      }

      // Criar tarefa
      const task = await Task.create({
        title: title.trim(),
        description: description ? description.trim() : null,
        status,
        priority,
        assigned_to,
        team_id,
        created_by: req.user.id,
        due_date: due_date ? new Date(due_date) : null
      });

      res.status(201).json({
        message: 'Tarefa criada com sucesso',
        task
      });

    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao criar tarefa'
      });
    }
  }

  // Atualizar tarefa
  static async updateTask(req, res) {
    try {
      const { id } = req.params;
      const { title, description, status, priority, assigned_to, due_date } = req.body;

      // Verificar se tarefa existe
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({
          error: 'Tarefa não encontrada',
          message: 'A tarefa especificada não existe'
        });
      }

      // Verificar se usuário pode editar a tarefa
      if (!task.canEdit(req.user.id, req.user.role)) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para editar esta tarefa'
        });
      }

      const updates = {};

      // Validar e preparar atualizações
      if (title) {
        if (title.trim().length < 3) {
          return res.status(400).json({
            error: 'Título muito curto',
            message: 'Título deve ter pelo menos 3 caracteres'
          });
        }
        updates.title = title.trim();
      }

      if (description !== undefined) {
        updates.description = description ? description.trim() : null;
      }

      if (status) {
        const validStatuses = ['Pendente', 'Em progresso', 'Concluído'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            error: 'Status inválido',
            message: 'Status deve ser: Pendente, Em progresso ou Concluído'
          });
        }
        updates.status = status;
      }

      if (priority) {
        const validPriorities = ['Alta', 'Média', 'Baixa'];
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({
            error: 'Prioridade inválida',
            message: 'Prioridade deve ser: Alta, Média ou Baixa'
          });
        }
        updates.priority = priority;
      }

      if (assigned_to !== undefined) {
        if (assigned_to) {
          // Verificar se usuário existe
          const assignedUser = await User.findById(assigned_to);
          if (!assignedUser) {
            return res.status(404).json({
              error: 'Usuário não encontrado',
              message: 'O usuário a ser atribuído não existe'
            });
          }

          // Verificar se é membro do time (apenas se não for admin)
          if (req.user.role !== 'admin') {
            const team = await Team.findById(task.team_id);
            const isAssignedUserMember = await team.isMember(assigned_to);
            if (!isAssignedUserMember) {
              return res.status(400).json({
                error: 'Usuário não é membro do time',
                message: 'O usuário atribuído deve ser membro do time'
              });
            }
          }
        }
        updates.assigned_to = assigned_to;
      }

      if (due_date !== undefined) {
        if (due_date) {
          const dueDate = new Date(due_date);
          if (isNaN(dueDate.getTime())) {
            return res.status(400).json({
              error: 'Data inválida',
              message: 'Formato de data de vencimento inválido'
            });
          }
          updates.due_date = dueDate;
        } else {
          updates.due_date = null;
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Nenhum dado para atualizar',
          message: 'Forneça pelo menos um campo para atualizar'
        });
      }

      // Atualizar tarefa
      const updatedTask = await Task.update(id, updates, req.user.id);

      res.json({
        message: 'Tarefa atualizada com sucesso',
        task: updatedTask
      });

    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao atualizar tarefa'
      });
    }
  }

  // Deletar tarefa
  static async deleteTask(req, res) {
    try {
      const { id } = req.params;

      // Verificar se tarefa existe
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({
          error: 'Tarefa não encontrada',
          message: 'A tarefa especificada não existe'
        });
      }

      // Verificar se usuário pode deletar a tarefa (apenas admin ou criador)
      if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: 'Apenas administradores ou o criador podem deletar esta tarefa'
        });
      }

      // Deletar tarefa
      const deleted = await Task.delete(id);
      
      if (!deleted) {
        return res.status(500).json({
          error: 'Erro ao deletar',
          message: 'Não foi possível deletar a tarefa'
        });
      }

      res.json({
        message: 'Tarefa deletada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao deletar tarefa'
      });
    }
  }

  // Atribuir tarefa a um usuário
  static async assignTask(req, res) {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          error: 'ID do usuário obrigatório',
          message: 'ID do usuário é obrigatório'
        });
      }

      // Verificar se tarefa existe
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({
          error: 'Tarefa não encontrada',
          message: 'A tarefa especificada não existe'
        });
      }

      // Verificar se usuário pode atribuir a tarefa
      if (!task.canEdit(req.user.id, req.user.role)) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para atribuir esta tarefa'
        });
      }

      // Verificar se usuário a ser atribuído existe
      const assignedUser = await User.findById(user_id);
      if (!assignedUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário a ser atribuído não existe'
        });
      }

      // Verificar se é membro do time (apenas se não for admin)
      if (req.user.role !== 'admin') {
        const team = await Team.findById(task.team_id);
        const isAssignedUserMember = await team.isMember(user_id);
        if (!isAssignedUserMember) {
          return res.status(400).json({
            error: 'Usuário não é membro do time',
            message: 'O usuário atribuído deve ser membro do time'
          });
        }
      }

      // Atribuir tarefa
      await task.assignTo(user_id, req.user.id);

      res.json({
        message: 'Tarefa atribuída com sucesso',
        task_id: id,
        assigned_to: assignedUser.toJSON()
      });

    } catch (error) {
      console.error('Erro ao atribuir tarefa:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao atribuir tarefa'
      });
    }
  }

  // Alterar status da tarefa
  static async changeStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        return res.status(400).json({
          error: 'Status obrigatório',
          message: 'Novo status é obrigatório'
        });
      }

      // Validar status
      const validStatuses = ['Pendente', 'Em progresso', 'Concluído'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Status inválido',
          message: 'Status deve ser: Pendente, Em progresso ou Concluído'
        });
      }

      // Verificar se tarefa existe
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({
          error: 'Tarefa não encontrada',
          message: 'A tarefa especificada não existe'
        });
      }

      // Verificar se usuário pode alterar o status
      if (!task.canEdit(req.user.id, req.user.role)) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para alterar o status desta tarefa'
        });
      }

      // Alterar status
      await task.changeStatus(status, req.user.id, reason);

      res.json({
        message: 'Status da tarefa alterado com sucesso',
        task_id: id,
        new_status: status
      });

    } catch (error) {
      console.error('Erro ao alterar status:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao alterar status da tarefa'
      });
    }
  }

  // Buscar histórico de uma tarefa
  static async getTaskHistory(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      // Verificar se tarefa existe
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({
          error: 'Tarefa não encontrada',
          message: 'A tarefa especificada não existe'
        });
      }

      // Verificar se usuário tem acesso à tarefa
      if (req.user.role !== 'admin') {
        const team = await Team.findById(task.team_id);
        const isMember = await team.isMember(req.user.id);
        
        if (!isMember && task.assigned_to !== req.user.id && task.created_by !== req.user.id) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem acesso ao histórico desta tarefa'
          });
        }
      }

      // Buscar histórico
      const history = await TaskHistory.findByTaskId(id, limit, offset);

      res.json({
        task: {
          id: task.id,
          title: task.title,
          status: task.status
        },
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar histórico da tarefa'
      });
    }
  }

  // Buscar atividade recente (para dashboard)
  static async getRecentActivity(req, res) {
    try {
      const { limit = 20 } = req.query;

      let activity;
      
      if (req.user.role === 'admin') {
        // Admin vê toda atividade
        activity = await TaskHistory.getRecentActivity(limit);
      } else {
        // Membros veem apenas atividade dos seus times
        const userTeams = await req.user.getTeams();
        const teamIds = userTeams.map(team => team.id);
        
        if (teamIds.length === 0) {
          activity = [];
        } else {
          const allActivity = [];
          for (const teamId of teamIds) {
            const teamActivity = await TaskHistory.getActivityStatsByTeam(teamId);
            allActivity.push(...teamActivity);
          }
          
          // Ordenar por data e limitar
          activity = allActivity
            .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
            .slice(0, limit);
        }
      }

      res.json({
        recent_activity: activity
      });

    } catch (error) {
      console.error('Erro ao buscar atividade recente:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar atividade recente'
      });
    }
  }
}

module.exports = TaskController;

