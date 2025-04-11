const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, isAdmin } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc Autenticar usuário e gerar token JWT
 * @access Public
 */
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('E-mail inválido')
    .normalizeEmail(),
  body('senha')
    .isLength({ min: 6 })
    .withMessage('A senha deve ter pelo menos 6 caracteres')
], authController.login);

/**
 * @route GET /api/auth/me
 * @desc Obter informações do usuário logado
 * @access Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route POST /api/auth/register
 * @desc Registrar um novo usuário (apenas admin)
 * @access Private/Admin
 */
router.post('/register', [
  authenticate,
  isAdmin,
  body('nome')
    .isLength({ min: 3 })
    .withMessage('O nome deve ter pelo menos 3 caracteres')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('E-mail inválido')
    .normalizeEmail(),
  body('senha')
    .isLength({ min: 6 })
    .withMessage('A senha deve ter pelo menos 6 caracteres'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Função inválida. Deve ser "user" ou "admin"')
], authController.register);


module.exports = router;