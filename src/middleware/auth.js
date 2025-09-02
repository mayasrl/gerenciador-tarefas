const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso requerido',
        message: 'Você precisa estar logado para acessar este recurso'
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco de dados
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'Usuário não encontrado'
      });
    }

    // Adicionar usuário ao request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'Token malformado ou inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        message: 'Seu token expirou. Faça login novamente'
      });
    }

    console.error('Erro na autenticação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao verificar autenticação'
    });
  }
};

// Middleware de autorização por role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        message: 'Faça login para continuar'
      });
    }

    // Converter para array se for string
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: `Apenas usuários com role ${allowedRoles.join(' ou ')} podem acessar este recurso`
      });
    }

    next();
  };
};

// Middleware específico para admin
const requireAdmin = requireRole('admin');

// Middleware para verificar se usuário pode acessar recurso de outro usuário
const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        message: 'Faça login para continuar'
      });
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam];
    
    // Admin pode acessar qualquer recurso
    if (req.user.role === 'admin') {
      return next();
    }

    // Usuário só pode acessar seus próprios recursos
    if (req.user.id !== targetUserId) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: 'Você só pode acessar seus próprios recursos'
      });
    }

    next();
  };
};

// Middleware para verificar se usuário é membro de um time
const requireTeamMembership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        message: 'Faça login para continuar'
      });
    }

    // Admin pode acessar qualquer time
    if (req.user.role === 'admin') {
      return next();
    }

    const teamId = req.params.teamId || req.body.team_id;
    if (!teamId) {
      return res.status(400).json({ 
        error: 'ID do time requerido',
        message: 'ID do time deve ser fornecido'
      });
    }

    // Verificar se usuário é membro do time
    const Team = require('../models/Team');
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ 
        error: 'Time não encontrado',
        message: 'O time especificado não existe'
      });
    }

    const isMember = await team.isMember(req.user.id);
    if (!isMember) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: 'Você não é membro deste time'
      });
    }

    req.team = team;
    next();
  } catch (error) {
    console.error('Erro ao verificar membership do time:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao verificar permissões do time'
    });
  }
};

// Função para gerar token JWT
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Função para verificar token sem middleware (útil para testes)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireOwnershipOrAdmin,
  requireTeamMembership,
  generateToken,
  verifyToken
};

