const { query } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.role = data.role;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar novo usuário
  static async create({ name, email, password, role = 'member' }) {
    try {
      // Hash da senha
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const result = await query(
        `INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, email, role, created_at, updated_at`,
        [name, email, password_hash, role]
      );

      return new User(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email já está em uso');
      }
      throw error;
    }
  }

  // Buscar usuário por ID
  static async findById(id) {
    const result = await query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  // Buscar usuário por email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  // Listar todos os usuários (apenas admin)
  static async findAll(limit = 50, offset = 0) {
    const result = await query(
      `SELECT id, name, email, role, created_at, updated_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => new User(row));
  }

  // Atualizar usuário
  static async update(id, updates) {
    const allowedFields = ['name', 'email', 'role'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Se a senha está sendo atualizada, fazer hash
    if (updates.password) {
      const saltRounds = 12;
      updates.password_hash = await bcrypt.hash(updates.password, saltRounds);
      delete updates.password;
      allowedFields.push('password_hash');
    }

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
      `UPDATE users SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, name, email, role, created_at, updated_at`,
      values
    );

    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  // Deletar usuário
  static async delete(id) {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rowCount > 0;
  }

  // Verificar senha
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  // Buscar times do usuário
  async getTeams() {
    const result = await query(
      `SELECT t.id, t.name, t.description, t.created_at, t.updated_at
       FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.name`,
      [this.id]
    );

    return result.rows;
  }

  // Buscar tarefas atribuídas ao usuário
  async getTasks(status = null) {
    let queryText = `
      SELECT t.*, team.name as team_name
      FROM tasks t
      INNER JOIN teams team ON t.team_id = team.id
      WHERE t.assigned_to = $1
    `;
    const params = [this.id];

    if (status) {
      queryText += ' AND t.status = $2';
      params.push(status);
    }

    queryText += ' ORDER BY t.created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  // Converter para JSON (sem senha)
  toJSON() {
    const { password_hash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;

