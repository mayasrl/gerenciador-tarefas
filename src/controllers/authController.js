const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

class AuthController {
  // Registro de usuário
  static async register(req, res) {
    try {
      const { name, email, password, role } = req.body;

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

      // Verificar se role é válida (apenas admin pode criar outros admins)
      let userRole = 'member'; // padrão
      if (role && role === 'admin') {
        // Verificar se quem está criando é admin
        if (req.user && req.user.role === 'admin') {
          userRole = 'admin';
        } else {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Apenas administradores podem criar outros administradores'
          });
        }
      }

      // Criar usuário
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: userRole
      });

      // Gerar token
      const token = generateToken(user);

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: user.toJSON(),
        token
      });

    } catch (error) {
      console.error('Erro no registro:', error);
      
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

  // Login de usuário
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validações básicas
      if (!email || !password) {
        return res.status(400).json({
          error: 'Dados obrigatórios',
          message: 'Email e senha são obrigatórios'
        });
      }

      // Buscar usuário por email
      const user = await User.findByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: 'Email ou senha incorretos'
        });
      }

      // Verificar senha
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: 'Email ou senha incorretos'
        });
      }

      // Gerar token
      const token = generateToken(user);

      res.json({
        message: 'Login realizado com sucesso',
        user: user.toJSON(),
        token
      });

    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao fazer login'
      });
    }
  }

  // Obter perfil do usuário logado
  static async getProfile(req, res) {
    try {
      // req.user já está disponível através do middleware de autenticação
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Perfil do usuário não encontrado'
        });
      }

      // Buscar informações adicionais
      const teams = await user.getTeams();
      const tasks = await user.getTasks();

      res.json({
        user: user.toJSON(),
        teams,
        tasks_count: tasks.length,
        recent_tasks: tasks.slice(0, 5) // últimas 5 tarefas
      });

    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar perfil do usuário'
      });
    }
  }

  // Atualizar perfil do usuário logado
  static async updateProfile(req, res) {
    try {
      const { name, email, password } = req.body;
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

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Nenhum dado para atualizar',
          message: 'Forneça pelo menos um campo para atualizar'
        });
      }

      // Atualizar usuário
      const updatedUser = await User.update(req.user.id, updates);
      
      if (!updatedUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Usuário não encontrado para atualização'
        });
      }

      res.json({
        message: 'Perfil atualizado com sucesso',
        user: updatedUser.toJSON()
      });

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      
      if (error.message === 'Email já está em uso') {
        return res.status(409).json({
          error: 'Email já existe',
          message: 'Este email já está sendo usado por outro usuário'
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao atualizar perfil'
      });
    }
  }

  // Verificar token (útil para frontend verificar se token ainda é válido)
  static async verifyToken(req, res) {
    try {
      // Se chegou até aqui, o token é válido (middleware de auth já verificou)
      res.json({
        valid: true,
        user: req.user.toJSON()
      });
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao verificar token'
      });
    }
  }

  // Logout (invalidar token - em uma implementação real, você manteria uma blacklist)
  static async logout(req, res) {
    try {
      // Em uma implementação real, você adicionaria o token a uma blacklist
      // Por enquanto, apenas retornamos sucesso
      res.json({
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao fazer logout'
      });
    }
  }
}

module.exports = AuthController;

