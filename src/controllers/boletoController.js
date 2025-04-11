const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');
const csvService = require('../services/csvService');
const pdfService = require('../services/pdfService');
const reportService = require('../services/reportService');
const Boleto = require('../database/models/Boleto');
const Lote = require('../database/models/Lote');

/**
 * Controlador para operações relacionadas a boletos
 */
class BoletoController {
  /**
   * Importa boletos de um arquivo CSV
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com o resultado da importação
   */
  async importarCSV(req, res) {
    try {
      // Verificar se o arquivo foi enviado
      if (!req.file) {
        return res.status(400).json({ 
          error: 'Arquivo não encontrado', 
          message: 'É necessário enviar um arquivo CSV' 
        });
      }

      // Verificar extensão do arquivo
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      if (fileExt !== '.csv') {
        // Excluir o arquivo enviado
        fs.unlinkSync(req.file.path);
        
        return res.status(400).json({ 
          error: 'Formato inválido', 
          message: 'O arquivo deve estar no formato CSV' 
        });
      }

      // Processar o arquivo CSV
      const result = await csvService.processBoletosCSV(req.file.path);

      // Excluir o arquivo após processamento
      fs.unlinkSync(req.file.path);

      return res.status(201).json({
        message: 'Importação concluída com sucesso',
        ...result
      });
    } catch (error) {
      // Excluir o arquivo em caso de erro (se existir)
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({ 
        error: 'Erro na importação', 
        message: error.message 
      });
    }
  }

  /**
   * Processa um arquivo PDF de boletos
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com o resultado do processamento
   */
  async processarPDF(req, res) {
    try {
      // Verificar se o arquivo foi enviado
      if (!req.file) {
        return res.status(400).json({ 
          error: 'Arquivo não encontrado', 
          message: 'É necessário enviar um arquivo PDF' 
        });
      }

      // Verificar extensão do arquivo
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      if (fileExt !== '.pdf') {
        // Excluir o arquivo enviado
        fs.unlinkSync(req.file.path);
        
        return res.status(400).json({ 
          error: 'Formato inválido', 
          message: 'O arquivo deve estar no formato PDF' 
        });
      }

      // Processar o arquivo PDF
      const result = await pdfService.splitPdfBoletos(req.file.path);

      // Manter o arquivo original para referência
      const originalDir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'originals');
      if (!fs.existsSync(originalDir)) {
        fs.mkdirSync(originalDir, { recursive: true });
      }
      
      const originalPath = path.join(originalDir, `boletos_original_${Date.now()}.pdf`);
      fs.copyFileSync(req.file.path, originalPath);
      fs.unlinkSync(req.file.path);

      return res.status(200).json({
        message: 'Processamento de PDF concluído com sucesso',
        ...result,
        arquivo_original: originalPath
      });
    } catch (error) {
      // Excluir o arquivo em caso de erro (se existir)
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({ 
        error: 'Erro no processamento do PDF', 
        message: error.message 
      });
    }
  }

  /**
   * Lista todos os boletos com opção de filtros e relatório
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com a lista de boletos ou relatório
   */
  async listarBoletos(req, res) {
    try {
      // Extrair filtros da query
      const { nome, id_lote, valor_inicial, valor_final, relatorio } = req.query;
      
      // Construir objeto de filtros
      const filtros = {};
      
      if (nome) filtros.nome = nome;
      if (id_lote) filtros.id_lote = parseInt(id_lote, 10);
      if (valor_inicial) filtros.valor_inicial = parseFloat(valor_inicial);
      if (valor_final) filtros.valor_final = parseFloat(valor_final);
      
      // Verificar se deve gerar relatório
      const gerarRelatorio = relatorio === '1';
      
      // Obter boletos filtrados (e relatório se solicitado)
      const result = await reportService.getBoletos(filtros, gerarRelatorio);
      
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao listar boletos', 
        message: error.message 
      });
    }
  }

  /**
   * Obtém um boleto específico pelo ID
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com os dados do boleto
   */
  async obterBoleto(req, res) {
    try {
      const { id } = req.params;
      
      // Buscar o boleto pelo ID
      const boleto = await Boleto.findOne({ 
        where: { 
          id, 
          ativo: true 
        },
        include: [
          {
            model: Lote,
            as: 'lote',
            attributes: ['nome']
          }
        ]
      });
      
      if (!boleto) {
        return res.status(404).json({ 
          error: 'Boleto não encontrado', 
          message: 'O boleto solicitado não existe ou foi desativado' 
        });
      }
      
      return res.status(200).json({ boleto });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao buscar boleto', 
        message: error.message 
      });
    }
  }

  /**
   * Baixa o PDF de um boleto específico
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com o arquivo PDF
   */
  async baixarPDF(req, res) {
    try {
      const { id } = req.params;
      
      // Buscar o boleto pelo ID
      const boleto = await Boleto.findOne({ 
        where: { 
          id, 
          ativo: true 
        }
      });
      
      if (!boleto) {
        return res.status(404).json({ 
          error: 'Boleto não encontrado', 
          message: 'O boleto solicitado não existe ou foi desativado' 
        });
      }
      
      // Verificar se o PDF existe
      if (!boleto.pdf_path || !fs.existsSync(boleto.pdf_path)) {
        return res.status(404).json({ 
          error: 'PDF não encontrado', 
          message: 'O arquivo PDF deste boleto não está disponível' 
        });
      }
      
      // Enviar o arquivo PDF
      return res.download(boleto.pdf_path, `boleto_${id}.pdf`);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao baixar PDF', 
        message: error.message 
      });
    }
  }

  /**
   * Cria um PDF de exemplo para testes
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com o caminho do arquivo gerado
   */
  async criarPDFExemplo(req, res) {
    try {
      // Obter nomes dos boletos para criar o exemplo
      const boletos = await Boleto.findAll({
        where: { ativo: true },
        order: [['id', 'ASC']],
        attributes: ['nome_sacado']
      });
      
      if (boletos.length === 0) {
        return res.status(404).json({ 
          error: 'Sem dados', 
          message: 'Não há boletos cadastrados para criar um PDF de exemplo' 
        });
      }
      
      // Extrair nomes dos boletos
      const nomes = boletos.map(b => b.nome_sacado);
      
      // Definir caminho de saída
      const outputPath = path.resolve(process.env.OUTPUT_DIR || './output', 'boletos_exemplo.pdf');
      
      // Criar o PDF de exemplo
      const filePath = await pdfService.criarPdfExemplo(nomes, outputPath);
      
      return res.status(200).json({
        message: 'PDF de exemplo criado com sucesso',
        arquivo: filePath
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao criar PDF de exemplo', 
        message: error.message 
      });
    }
  }

  /**
   * Atualiza dados de um boleto
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com os dados atualizados
   */
  async atualizarBoleto(req, res) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { nome_sacado, id_lote, valor, linha_digitavel, ativo } = req.body;
      
      // Buscar o boleto pelo ID
      const boleto = await Boleto.findByPk(id);
      
      if (!boleto) {
        return res.status(404).json({ 
          error: 'Boleto não encontrado', 
          message: 'O boleto solicitado não existe' 
        });
      }
      
      // Verificar se o lote existe, caso esteja sendo atualizado
      if (id_lote) {
        const loteExists = await Lote.findByPk(id_lote);
        if (!loteExists) {
          return res.status(400).json({ 
            error: 'Lote inválido', 
            message: 'O lote informado não existe' 
          });
        }
      }
      
      // Atualizar os campos
      await boleto.update({
        nome_sacado: nome_sacado || boleto.nome_sacado,
        id_lote: id_lote || boleto.id_lote,
        valor: valor || boleto.valor,
        linha_digitavel: linha_digitavel || boleto.linha_digitavel,
        ativo: ativo !== undefined ? ativo : boleto.ativo
      });
      
      return res.status(200).json({
        message: 'Boleto atualizado com sucesso',
        boleto
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao atualizar boleto', 
        message: error.message 
      });
    }
  }
  
  /**
   * Remove (desativa) um boleto do sistema
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com confirmação
   */
  async removerBoleto(req, res) {
    try {
      const { id } = req.params;
      
      // Buscar o boleto pelo ID
      const boleto = await Boleto.findByPk(id);
      
      if (!boleto) {
        return res.status(404).json({ 
          error: 'Boleto não encontrado', 
          message: 'O boleto solicitado não existe' 
        });
      }
      
      // Desativar o boleto em vez de excluir (soft delete)
      await boleto.update({ ativo: false });
      
      return res.status(200).json({
        message: 'Boleto removido com sucesso'
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao remover boleto', 
        message: error.message 
      });
    }
  }
  
  /**
   * Obtém estatísticas sobre os boletos
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com estatísticas
   */
  async estatisticas(req, res) {
    try {
      const stats = await reportService.getEstatisticas();
      
      return res.status(200).json(stats);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao obter estatísticas', 
        message: error.message 
      });
    }
  }
}

module.exports = new BoletoController();