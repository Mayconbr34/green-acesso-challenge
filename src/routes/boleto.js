const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, param, query } = require('express-validator');
const boletoController = require('../controllers/boletoController');
const { authenticate, isAdmin } = require('../middlewares/auth');

const router = express.Router();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Define o destino com base no tipo de arquivo
    const fileType = path.extname(file.originalname).toLowerCase();
    let uploadDir;
    
    if (fileType === '.csv') {
      uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'csv');
    } else if (fileType === '.pdf') {
      uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'pdf');
    } else {
      uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'other');
    }
    
    // Cria o diretório se não existir
    require('fs').mkdirSync(uploadDir, { recursive: true });
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gera um nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Filtro para permitir apenas arquivos CSV e PDF
const fileFilter = (req, file, cb) => {
  const fileTypes = /csv|pdf/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas arquivos CSV e PDF são permitidos'));
  }
};

// Inicializa o Multer com as configurações
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 10485760) // 10MB padrão
  }
});

/**
 * @route POST /api/boletos/importar-csv
 * @desc Importar boletos de um arquivo CSV
 * @access Private
 */
router.post('/importar-csv', [
  authenticate,
  upload.single('arquivo')
], boletoController.importarCSV);

/**
 * @route POST /api/boletos/processar-pdf
 * @desc Processar arquivo PDF com boletos
 * @access Private
 */
router.post('/processar-pdf', [
  authenticate,
  upload.single('arquivo')
], boletoController.processarPDF);

/**
 * @route GET /api/boletos
 * @desc Listar boletos com filtros e opção de relatório
 * @access Private
 */
router.get('/', [
  authenticate,
  query('nome').optional().isString().trim(),
  query('id_lote').optional().isInt().withMessage('ID do lote deve ser um número inteiro'),
  query('valor_inicial').optional().isFloat().withMessage('Valor inicial deve ser um número'),
  query('valor_final').optional().isFloat().withMessage('Valor final deve ser um número'),
  query('relatorio').optional().isIn(['0', '1']).withMessage('Relatório deve ser 0 ou 1')
], boletoController.listarBoletos);

/**
 * @route GET /api/boletos/estatisticas
 * @desc Obter estatísticas dos boletos
 * @access Private
 */
router.get('/estatisticas', authenticate, boletoController.estatisticas);

/**
 * @route GET /api/boletos/:id
 * @desc Obter detalhes de um boleto específico
 * @access Private
 */
router.get('/:id', [
  authenticate,
  param('id').isInt().withMessage('ID inválido')
], boletoController.obterBoleto);

/**
 * @route GET /api/boletos/:id/pdf
 * @desc Baixar o PDF de um boleto específico
 * @access Private
 */
router.get('/:id/pdf', [
  authenticate,
  param('id').isInt().withMessage('ID inválido')
], boletoController.baixarPDF);

/**
 * @route PUT /api/boletos/:id
 * @desc Atualizar dados de um boleto
 * @access Private/Admin
 */
router.put('/:id', [
  authenticate,
  isAdmin,
  param('id').isInt().withMessage('ID inválido'),
  body('nome_sacado').optional().isString().trim(),
  body('id_lote').optional().isInt().withMessage('ID do lote deve ser um número inteiro'),
  body('valor').optional().isFloat().withMessage('Valor deve ser um número'),
  body('linha_digitavel').optional().isString().trim(),
  body('ativo').optional().isBoolean().withMessage('Ativo deve ser um booleano')
], boletoController.atualizarBoleto);

/**
 * @route DELETE /api/boletos/:id
 * @desc Remover (desativar) um boleto
 * @access Private/Admin
 */
router.delete('/:id', [
  authenticate,
  isAdmin,
  param('id').isInt().withMessage('ID inválido')
], boletoController.removerBoleto);

/**
 * @route POST /api/boletos/criar-pdf-exemplo
 * @desc Cria um PDF de exemplo para testes
 * @access Private/Admin
 */
router.post('/criar-pdf-exemplo', [authenticate, isAdmin], boletoController.criarPDFExemplo);

module.exports = router;