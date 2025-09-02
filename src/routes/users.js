const express = require('express');
const UserController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas de usuários requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/users
 * @desc Listar todos os usuários
 * @access Admin only
 */
router.get('/', requireAdmin, UserController.getAllUsers);

/**
 * @route GET /api/users/:id
 * @desc Buscar usuário por ID
 * @access Admin only
 */
router.get('/:id', requireAdmin, UserController.getUserById);

/**
 * @route POST /api/users
 * @desc Criar novo usuário
 * @access Admin only
 */
router.post('/', requireAdmin, UserController.createUser);

/**
 * @route PUT /api/users/:id
 * @desc Atualizar usuário
 * @access Admin only
 */
router.put('/:id', requireAdmin, UserController.updateUser);

/**
 * @route DELETE /api/users/:id
 * @desc Deletar usuário
 * @access Admin only
 */
router.delete('/:id', requireAdmin, UserController.deleteUser);

/**
 * @route GET /api/users/:id/tasks
 * @desc Buscar tarefas de um usuário
 * @access Admin only
 */
router.get('/:id/tasks', requireAdmin, UserController.getUserTasks);

/**
 * @route GET /api/users/:id/teams
 * @desc Buscar times de um usuário
 * @access Admin only
 */
router.get('/:id/teams', requireAdmin, UserController.getUserTeams);

module.exports = router;

