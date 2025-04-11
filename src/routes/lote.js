const express = require('express');
const { body, param } = require('express-validator');
const loteController = require('../controllers/loteController');
const { authenticate, isAdmin } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/lotes
 * @desc Listar todos os lotes
 * @access Private
 */
router.get('/', authenticate, loteController.listarLotes);

/**
 * @route POST /api/lotes
 * @desc Criar um novo lote
 * @access Private/Admin
 */
router.post('/', [
  authenticate,
  isAdmin,
  body('nome')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome é obrigatório e deve ter no máximo 100 caracteres')
], loteController.criarLote);

/**
 * @route PUT /api/lotes/:id
 * @desc Atualizar um lote existente
 * @access Private/Admin
 */
router.put('/:id', [
  authenticate,
  isAdmin,
  param('id').isInt().withMessage('ID inválido'),
  body('nome')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome deve ter no máximo 100 caracteres'),
  body('ativo')
    .optional()
    .isBoolean()
    .withMessage('Ativo deve ser um booleano')
], loteController.atualizarLote);

/**
 * @route DELETE /api/lotes/:id
 * @desc Remover (desativar) um lote
 * @access Private/Admin
 */
router.delete('/:id', [
  authenticate,
  isAdmin,
  param('id').isInt().withMessage('ID inválido')
], loteController.removerLote);

/**
 * @route GET /api/lotes/mapeamentos
 * @desc Listar mapeamentos entre unidades externas e lotes internos
 * @access Private
 */
router.get('/mapeamentos', authenticate, loteController.listarMapeamentos);

/**
 * @route POST /api/lotes/mapeamentos
 * @desc Criar um novo mapeamento
 * @access Private/Admin
 */
router.post('/mapeamentos', [
  authenticate,
  isAdmin,
  body('nome_externo')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome externo é obrigatório e deve ter no máximo 100 caracteres'),
  body('id_lote_interno')
    .isInt()
    .withMessage('ID do lote interno deve ser um número inteiro')
], loteController.criarMapeamento);

/**
 * @route PUT /api/lotes/mapeamentos/:id
 * @desc Atualizar um mapeamento existente
 * @access Private/Admin
 */
router.put('/mapeamentos/:id', [
  authenticate,
  isAdmin,
  param('id').isInt().withMessage('ID inválido'),
  body('nome_externo')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome externo deve ter no máximo 100 caracteres'),
  body('id_lote_interno')
    .optional()
    .isInt()
    .withMessage('ID do lote interno deve ser um número inteiro')
], loteController.atualizarMapeamento);

/**
 * @route DELETE /api/lotes/mapeamentos/:id
 * @desc Remover um mapeamento
 * @access Private/Admin
 */
router.delete('/mapeamentos/:id', [
  authenticate,
  isAdmin,
  param('id').isInt().withMessage('ID inválido')
], loteController.removerMapeamento);

module.exports = router;