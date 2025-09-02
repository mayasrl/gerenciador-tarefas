const { query } = require('../config/database');

class Team {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar novo time
  static async create({ name, description, created_by }) {
    try {
      const result = await query(
        `INSERT INTO teams (name, description, created_by) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [name, description, created_by]
      );

      const team = new Team(result.rows[0]);
      
      // Adicionar o criador como membro do time automaticamente
      await team.addMember(created_by);
      
      return team;
    } catch (error) {
      throw error;
    }
  }

  // Buscar time por ID
  static async findById(id) {
    const result = await query(
      'SELECT * FROM teams WHERE id = $1',
      [id]
    );

    return result.rows[0] ? new Team(result.rows[0]) : null;
  }

  // Listar todos os times
  static async findAll(limit = 50, offset = 0) {
    const result = await query(
      `SELECT t.*, u.name as created_by_name
       FROM teams t
       INNER JOIN users u ON t.created_by = u.id
       ORDER BY t.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => new Team(row));
  }

  // Buscar times de um usuário
  static async findByUserId(userId) {
    const result = await query(
      `SELECT t.*, u.name as created_by_name
       FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id
       INNER JOIN users u ON t.created_by = u.id
       WHERE tm.user_id = $1
       ORDER BY t.name`,
      [userId]
    );

    return result.rows.map(row => new Team(row));
  }

  // Atualizar time
  static async update(id, updates) {
    const allowedFields = ['name', 'description'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Construir query dinamicamente
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('Nenhum campo válido para atualizar');
    }

    values.push(id);
    const result = await query(
      `UPDATE teams SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    return result.rows[0] ? new Team(result.rows[0]) : null;
  }

  // Deletar time
  static async delete(id) {
    const result = await query(
      'DELETE FROM teams WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rowCount > 0;
  }

  // Adicionar membro ao time
  async addMember(userId) {
    try {
      await query(
        'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
        [this.id, userId]
      );
      return true;
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Usuário já é membro deste time');
      }
      throw error;
    }
  }

  // Remover membro do time
  async removeMember(userId) {
    const result = await query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [this.id, userId]
    );

    return result.rowCount > 0;
  }

  // Listar membros do time
  async getMembers() {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, tm.joined_at
       FROM users u
       INNER JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY u.name`,
      [this.id]
    );

    return result.rows;
  }

  // Verificar se usuário é membro do time
  async isMember(userId) {
    const result = await query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [this.id, userId]
    );

    return result.rowCount > 0;
  }

  // Buscar tarefas do time
  async getTasks(status = null, assignedTo = null) {
    let queryText = `
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      INNER JOIN users creator ON t.created_by = creator.id
      WHERE t.team_id = $1
    `;
    const params = [this.id];
    let paramCount = 2;

    if (status) {
      queryText += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (assignedTo) {
      queryText += ` AND t.assigned_to = $${paramCount}`;
      params.push(assignedTo);
      paramCount++;
    }

    queryText += ' ORDER BY t.created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  // Estatísticas do time
  async getStats() {
    const result = await query(
      `SELECT 
         COUNT(*) as total_tasks,
         COUNT(CASE WHEN status = 'Pendente' THEN 1 END) as pending_tasks,
         COUNT(CASE WHEN status = 'Em progresso' THEN 1 END) as in_progress_tasks,
         COUNT(CASE WHEN status = 'Concluído' THEN 1 END) as completed_tasks,
         COUNT(DISTINCT assigned_to) as active_members
       FROM tasks 
       WHERE team_id = $1`,
      [this.id]
    );

    return result.rows[0];
  }
}

module.exports = Team;

