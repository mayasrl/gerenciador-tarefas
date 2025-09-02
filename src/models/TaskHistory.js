const { query } = require('../config/database');

class TaskHistory {
  constructor(data) {
    this.id = data.id;
    this.task_id = data.task_id;
    this.changed_by = data.changed_by;
    this.field_changed = data.field_changed;
    this.old_value = data.old_value;
    this.new_value = data.new_value;
    this.change_reason = data.change_reason;
    this.changed_at = data.changed_at;
  }

  // Criar novo registro de histórico
  static async create({ task_id, changed_by, field_changed, old_value, new_value, change_reason }) {
    try {
      const result = await query(
        `INSERT INTO task_history (task_id, changed_by, field_changed, old_value, new_value, change_reason) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [task_id, changed_by, field_changed, old_value, new_value, change_reason]
      );

      return new TaskHistory(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar histórico por ID
  static async findById(id) {
    const result = await query(
      `SELECT th.*, u.name as changed_by_name
       FROM task_history th
       INNER JOIN users u ON th.changed_by = u.id
       WHERE th.id = $1`,
      [id]
    );

    return result.rows[0] ? new TaskHistory(result.rows[0]) : null;
  }

  // Buscar histórico de uma tarefa específica
  static async findByTaskId(taskId, limit = 100, offset = 0) {
    const result = await query(
      `SELECT th.*, u.name as changed_by_name
       FROM task_history th
       INNER JOIN users u ON th.changed_by = u.id
       WHERE th.task_id = $1
       ORDER BY th.changed_at DESC
       LIMIT $2 OFFSET $3`,
      [taskId, limit, offset]
    );

    return result.rows.map(row => new TaskHistory(row));
  }

  // Buscar histórico por usuário que fez a mudança
  static async findByChangedBy(userId, limit = 100, offset = 0) {
    const result = await query(
      `SELECT th.*, u.name as changed_by_name, t.title as task_title
       FROM task_history th
       INNER JOIN users u ON th.changed_by = u.id
       INNER JOIN tasks t ON th.task_id = t.id
       WHERE th.changed_by = $1
       ORDER BY th.changed_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(row => new TaskHistory(row));
  }

  // Buscar histórico de mudanças de um campo específico
  static async findByField(fieldName, limit = 100, offset = 0) {
    const result = await query(
      `SELECT th.*, u.name as changed_by_name, t.title as task_title
       FROM task_history th
       INNER JOIN users u ON th.changed_by = u.id
       INNER JOIN tasks t ON th.task_id = t.id
       WHERE th.field_changed = $1
       ORDER BY th.changed_at DESC
       LIMIT $2 OFFSET $3`,
      [fieldName, limit, offset]
    );

    return result.rows.map(row => new TaskHistory(row));
  }

  // Buscar histórico de um time específico
  static async findByTeamId(teamId, limit = 100, offset = 0) {
    const result = await query(
      `SELECT th.*, u.name as changed_by_name, t.title as task_title
       FROM task_history th
       INNER JOIN users u ON th.changed_by = u.id
       INNER JOIN tasks t ON th.task_id = t.id
       WHERE t.team_id = $1
       ORDER BY th.changed_at DESC
       LIMIT $2 OFFSET $3`,
      [teamId, limit, offset]
    );

    return result.rows.map(row => new TaskHistory(row));
  }

  // Buscar atividade recente (últimas mudanças)
  static async getRecentActivity(limit = 50) {
    const result = await query(
      `SELECT th.*, 
              u.name as changed_by_name, 
              t.title as task_title,
              team.name as team_name
       FROM task_history th
       INNER JOIN users u ON th.changed_by = u.id
       INNER JOIN tasks t ON th.task_id = t.id
       INNER JOIN teams team ON t.team_id = team.id
       ORDER BY th.changed_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => new TaskHistory(row));
  }

  // Estatísticas de atividade por usuário
  static async getActivityStatsByUser(userId, startDate = null, endDate = null) {
    let queryText = `
      SELECT 
        field_changed,
        COUNT(*) as change_count,
        DATE(changed_at) as change_date
      FROM task_history 
      WHERE changed_by = $1
    `;
    const params = [userId];
    let paramCount = 2;

    if (startDate) {
      queryText += ` AND changed_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND changed_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    queryText += `
      GROUP BY field_changed, DATE(changed_at)
      ORDER BY change_date DESC, change_count DESC
    `;

    const result = await query(queryText, params);
    return result.rows;
  }

  // Estatísticas de atividade por time
  static async getActivityStatsByTeam(teamId, startDate = null, endDate = null) {
    let queryText = `
      SELECT 
        th.field_changed,
        COUNT(*) as change_count,
        DATE(th.changed_at) as change_date,
        u.name as changed_by_name
      FROM task_history th
      INNER JOIN tasks t ON th.task_id = t.id
      INNER JOIN users u ON th.changed_by = u.id
      WHERE t.team_id = $1
    `;
    const params = [teamId];
    let paramCount = 2;

    if (startDate) {
      queryText += ` AND th.changed_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND th.changed_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    queryText += `
      GROUP BY th.field_changed, DATE(th.changed_at), u.name
      ORDER BY change_date DESC, change_count DESC
    `;

    const result = await query(queryText, params);
    return result.rows;
  }

  // Deletar histórico antigo (para limpeza)
  static async deleteOldHistory(daysOld = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await query(
      'DELETE FROM task_history WHERE changed_at < $1',
      [cutoffDate]
    );

    return result.rowCount;
  }

  // Formatar mudança para exibição
  getFormattedChange() {
    const fieldNames = {
      'created': 'Criação',
      'title': 'Título',
      'description': 'Descrição',
      'status': 'Status',
      'priority': 'Prioridade',
      'assigned_to': 'Responsável',
      'due_date': 'Data de vencimento'
    };

    const fieldName = fieldNames[this.field_changed] || this.field_changed;
    
    if (this.field_changed === 'created') {
      return `${fieldName}: ${this.new_value}`;
    }

    return `${fieldName}: ${this.old_value || 'vazio'} → ${this.new_value || 'vazio'}`;
  }

  // Converter para JSON com formatação
  toJSON() {
    return {
      ...this,
      formatted_change: this.getFormattedChange()
    };
  }
}

module.exports = TaskHistory;

