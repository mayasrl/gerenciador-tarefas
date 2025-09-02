const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Registrar novo usuário
 * @access Public (para membros) / Admin (para criar outros admins)
 */
router.post('/register', (req, res, next) => {
  // Se está tentando criar admin, verificar autenticação
  if (req.body.role === 'admin') {
    return authenticateToken(req, res, () => {
      requireAdmin(req, res, () => {
        AuthController.register(req, res);
      });
    });
  }
  
  // Para membros normais, não precisa autenticação
  AuthController.register(req, res);
});

/**
 * @route POST /api/auth/login
 * @desc Login de usuário
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route GET /api/auth/profile
 * @desc Obter perfil do usuário logado
 * @access Private
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc Atualizar perfil do usuário logado
 * @access Private
 */
router.put('/profile', authenticateToken, AuthController.updateProfile);

/**
 * @route GET /api/auth/verify
 * @desc Verificar se token é válido
 * @access Private
 */
router.get('/verify', authenticateToken, AuthController.verifyToken);

/**
 * @route POST /api/auth/logout
 * @desc Logout do usuário
 * @access Private
 */
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;

