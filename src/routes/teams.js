const express = require('express');
const TeamController = require('../controllers/teamController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas de times requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/teams
 * @desc Listar times (admin vê todos, membros veem apenas seus times)
 * @access Private
 */
router.get('/', TeamController.getAllTeams);

/**
 * @route GET /api/teams/:id
 * @desc Buscar time por ID
 * @access Private (apenas membros do time ou admin)
 */
router.get('/:id', TeamController.getTeamById);

/**
 * @route POST /api/teams
 * @desc Criar novo time
 * @access Admin only
 */
router.post('/', requireAdmin, TeamController.createTeam);

/**
 * @route PUT /api/teams/:id
 * @desc Atualizar time
 * @access Admin only
 */
router.put('/:id', requireAdmin, TeamController.updateTeam);

/**
 * @route DELETE /api/teams/:id
 * @desc Deletar time
 * @access Admin only
 */
router.delete('/:id', requireAdmin, TeamController.deleteTeam);

/**
 * @route GET /api/teams/:id/members
 * @desc Listar membros do time
 * @access Private (apenas membros do time ou admin)
 */
router.get('/:id/members', TeamController.getTeamMembers);

/**
 * @route POST /api/teams/:id/members
 * @desc Adicionar membro ao time
 * @access Admin only
 */
router.post('/:id/members', requireAdmin, TeamController.addMember);

/**
 * @route DELETE /api/teams/:id/members/:userId
 * @desc Remover membro do time
 * @access Admin only
 */
router.delete('/:id/members/:userId', requireAdmin, TeamController.removeMember);

/**
 * @route GET /api/teams/:id/tasks
 * @desc Buscar tarefas do time
 * @access Private (apenas membros do time ou admin)
 */
router.get('/:id/tasks', TeamController.getTeamTasks);

/**
 * @route GET /api/teams/:id/stats
 * @desc Estatísticas do time
 * @access Private (apenas membros do time ou admin)
 */
router.get('/:id/stats', TeamController.getTeamStats);

module.exports = router;

