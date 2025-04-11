const express = require('express');
const authRoutes = require('./auth');
const boletoRoutes = require('./boleto');
const loteRoutes = require('./lote');

const router = express.Router();

/**
 * @route GET /api/status
 * @desc Verifica o status da API
 * @access Public
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API está funcionando corretamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Agrupar rotas
router.use('/auth', authRoutes);
router.use('/boletos', boletoRoutes);
router.use('/lotes', loteRoutes);

module.exports = router;