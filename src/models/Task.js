const { query } = require('../config/database');
const TaskHistory = require('./TaskHistory');

class Task {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.priority = data.priority;
    this.assigned_to = data.assigned_to;
    this.team_id = data.team_id;
    this.created_by = data.created_by;
    this.due_date = data.due_date;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar nova tarefa
  static async create({ title, description, status = 'Pendente', priority = 'Média', assigned_to, team_id, created_by, due_date }) {
    try {
      const result = await query(
        `INSERT INTO tasks (title, description, status, priority, assigned_to, team_id, created_by, due_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [title, description, status, priority, assigned_to, team_id, created_by, due_date]
      );

      const task = new Task(result.rows[0]);
      
      // Registrar criação no histórico
      await TaskHistory.create({
        task_id: task.id,
        changed_by: created_by,
        field_changed: 'created',
        new_value: 'Tarefa criada',
        change_reason: 'Criação inicial da tarefa'
      });

      return task;
    } catch (error) {
      throw error;
    }
  }

  // Buscar tarefa por ID
  static async findById(id) {
    const result = await query(
      `SELECT t.*, 
              u.name as assigned_to_name, 
              creator.name as created_by_name,
              team.name as team_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       INNER JOIN users creator ON t.created_by = creator.id
       INNER JOIN teams team ON t.team_id = team.id
       WHERE t.id = $1`,
      [id]
    );

    return result.rows[0] ? new Task(result.rows[0]) : null;
  }

  // Listar todas as tarefas (com filtros)
  static async findAll({ status, priority, assigned_to, team_id, created_by, limit = 50, offset = 0 }) {
    let queryText = `
      SELECT t.*, 
             u.name as assigned_to_name, 
             creator.name as created_by_name,
             team.name as team_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      INNER JOIN users creator ON t.created_by = creator.id
      INNER JOIN teams team ON t.team_id = team.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Aplicar filtros
    if (status) {
      queryText += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      queryText += ` AND t.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (assigned_to) {
      queryText += ` AND t.assigned_to = $${paramCount}`;
      params.push(assigned_to);
      paramCount++;
    }

    if (team_id) {
      queryText += ` AND t.team_id = $${paramCount}`;
      params.push(team_id);
      paramCount++;
    }

    if (created_by) {
      queryText += ` AND t.created_by = $${paramCount}`;
      params.push(created_by);
      paramCount++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows.map(row => new Task(row));
  }

  // Buscar tarefas de um usuário específico
  static async findByUserId(userId, { status, team_id, limit = 50, offset = 0 }) {
    let queryText = `
      SELECT t.*, 
             u.name as assigned_to_name, 
             creator.name as created_by_name,
             team.name as team_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      INNER JOIN users creator ON t.created_by = creator.id
      INNER JOIN teams team ON t.team_id = team.id
      WHERE t.assigned_to = $1
    `;
    const params = [userId];
    let paramCount = 2;

    if (status) {
      queryText += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (team_id) {
      queryText += ` AND t.team_id = $${paramCount}`;
      params.push(team_id);
      paramCount++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows.map(row => new Task(row));
  }

  // Atualizar tarefa
  static async update(id, updates, changedBy) {
    const allowedFields = ['title', 'description', 'status', 'priority', 'assigned_to', 'due_date'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Buscar tarefa atual para comparar mudanças
    const currentTask = await Task.findById(id);
    if (!currentTask) {
      throw new Error('Tarefa não encontrada');
    }

    // Construir query dinamicamente e registrar mudanças
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && currentTask[key] !== value) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;

        // Registrar mudança no histórico
        await TaskHistory.create({
          task_id: id,
          changed_by: changedBy,
          field_changed: key,
          old_value: currentTask[key],
          new_value: value,
          change_reason: `Campo ${key} atualizado`
        });
      }
    }

    if (fields.length === 0) {
      return currentTask; // Nenhuma mudança
    }

    values.push(id);
    const result = await query(
      `UPDATE tasks SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    return result.rows[0] ? new Task(result.rows[0]) : null;
  }

  // Deletar tarefa
  static async delete(id) {
    const result = await query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rowCount > 0;
  }

  // Atribuir tarefa a um usuário
  async assignTo(userId, changedBy) {
    const oldAssignee = this.assigned_to;
    
    const result = await query(
      'UPDATE tasks SET assigned_to = $1 WHERE id = $2 RETURNING *',
      [userId, this.id]
    );

    if (result.rowCount > 0) {
      // Registrar mudança no histórico
      await TaskHistory.create({
        task_id: this.id,
        changed_by: changedBy,
        field_changed: 'assigned_to',
        old_value: oldAssignee,
        new_value: userId,
        change_reason: 'Tarefa reatribuída'
      });

      this.assigned_to = userId;
      return true;
    }

    return false;
  }

  // Alterar status da tarefa
  async changeStatus(newStatus, changedBy, reason = null) {
    const oldStatus = this.status;
    
    const result = await query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [newStatus, this.id]
    );

    if (result.rowCount > 0) {
      // Registrar mudança no histórico
      await TaskHistory.create({
        task_id: this.id,
        changed_by: changedBy,
        field_changed: 'status',
        old_value: oldStatus,
        new_value: newStatus,
        change_reason: reason || `Status alterado de ${oldStatus} para ${newStatus}`
      });

      this.status = newStatus;
      return true;
    }

    return false;
  }

  // Buscar histórico da tarefa
  async getHistory() {
    return await TaskHistory.findByTaskId(this.id);
  }

  // Verificar se usuário pode editar a tarefa
  canEdit(userId, userRole) {
    // Admin pode editar qualquer tarefa
    if (userRole === 'admin') {
      return true;
    }

    // Usuário pode editar apenas suas próprias tarefas
    return this.assigned_to === userId || this.created_by === userId;
  }

  // Verificar se tarefa está atrasada
  isOverdue() {
    if (!this.due_date) return false;
    return new Date(this.due_date) < new Date() && this.status !== 'Concluído';
  }

  // Calcular dias restantes
  getDaysRemaining() {
    if (!this.due_date) return null;
    const today = new Date();
    const dueDate = new Date(this.due_date);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

module.exports = Task;

