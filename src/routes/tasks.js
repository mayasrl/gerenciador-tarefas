const express = require('express');
const TaskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas de tarefas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/tasks
 * @desc Listar tarefas (admin vê todas, membros veem apenas de seus times)
 * @access Private
 */
router.get('/', TaskController.getAllTasks);

/**
 * @route GET /api/tasks/recent-activity
 * @desc Buscar atividade recente
 * @access Private
 */
router.get('/recent-activity', TaskController.getRecentActivity);

/**
 * @route GET /api/tasks/:id
 * @desc Buscar tarefa por ID
 * @access Private (apenas membros do time ou admin)
 */
router.get('/:id', TaskController.getTaskById);

/**
 * @route POST /api/tasks
 * @desc Criar nova tarefa
 * @access Private (membros do time podem criar)
 */
router.post('/', TaskController.createTask);

/**
 * @route PUT /api/tasks/:id
 * @desc Atualizar tarefa
 * @access Private (apenas quem pode editar a tarefa)
 */
router.put('/:id', TaskController.updateTask);

/**
 * @route DELETE /api/tasks/:id
 * @desc Deletar tarefa
 * @access Private (apenas admin ou criador)
 */
router.delete('/:id', TaskController.deleteTask);

/**
 * @route POST /api/tasks/:id/assign
 * @desc Atribuir tarefa a um usuário
 * @access Private (apenas quem pode editar a tarefa)
 */
router.post('/:id/assign', TaskController.assignTask);

/**
 * @route POST /api/tasks/:id/status
 * @desc Alterar status da tarefa
 * @access Private (apenas quem pode editar a tarefa)
 */
router.post('/:id/status', TaskController.changeStatus);

/**
 * @route GET /api/tasks/:id/history
 * @desc Buscar histórico de uma tarefa
 * @access Private (apenas membros do time ou admin)
 */
router.get('/:id/history', TaskController.getTaskHistory);

module.exports = router;

