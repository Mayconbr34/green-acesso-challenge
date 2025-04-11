const { validationResult } = require('express-validator');
const Lote = require('../database/models/Lote');
const MapeamentoLote = require('../database/models/MapeamentoLote');
const { sequelize } = require('../config/database');

/**
 * Controlador para operações relacionadas a lotes
 */
class LoteController {
  /**
   * Lista todos os lotes
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com a lista de lotes
   */
  async listarLotes(req, res) {
    try {
      const lotes = await Lote.findAll({
        where: { ativo: true },
        order: [['nome', 'ASC']]
      });
      
      return res.status(200).json({ lotes });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao listar lotes', 
        message: error.message 
      });
    }
  }
  
  /**
   * Obtém mapeamentos entre unidades externas e lotes internos
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com os mapeamentos
   */
  async listarMapeamentos(req, res) {
    try {
      const mapeamentos = await MapeamentoLote.findAll({
        include: [
          {
            model: Lote,
            as: 'loteInterno',
            attributes: ['id', 'nome']
          }
        ],
        order: [['nome_externo', 'ASC']]
      });
      
      return res.status(200).json({ mapeamentos });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao listar mapeamentos', 
        message: error.message 
      });
    }
  }
  
  /**
   * Cria um novo lote
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com o lote criado
   */
  async criarLote(req, res) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { nome } = req.body;
      
      // Verificar se já existe um lote com o mesmo nome
      const loteExists = await Lote.findOne({ where: { nome } });
      if (loteExists) {
        return res.status(400).json({
          error: 'Lote já existe',
          message: 'Já existe um lote cadastrado com este nome'
        });
      }
      
      // Criar o lote
      const lote = await Lote.create({
        nome,
        ativo: true
      });
      
      return res.status(201).json({
        message: 'Lote criado com sucesso',
        lote
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao criar lote', 
        message: error.message 
      });
    }
  }
  
  /**
   * Atualiza um lote existente
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com o lote atualizado
   */
  async atualizarLote(req, res) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { nome, ativo } = req.body;
      
      // Buscar o lote pelo ID
      const lote = await Lote.findByPk(id);
      
      if (!lote) {
        return res.status(404).json({
          error: 'Lote não encontrado',
          message: 'O lote solicitado não existe'
        });
      }
      
      // Verificar se já existe outro lote com o mesmo nome
      if (nome && nome !== lote.nome) {
        const loteExists = await Lote.findOne({ where: { nome } });
        if (loteExists) {
          return res.status(400).json({
            error: 'Nome duplicado',
            message: 'Já existe outro lote cadastrado com este nome'
          });
        }
      }
      
      // Atualizar os campos
      await lote.update({
        nome: nome || lote.nome,
        ativo: ativo !== undefined ? ativo : lote.ativo
      });
      
      return res.status(200).json({
        message: 'Lote atualizado com sucesso',
        lote
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao atualizar lote', 
        message: error.message 
      });
    }
  }
  
  /**
   * Remove (desativa) um lote
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com confirmação
   */
  async removerLote(req, res) {
    try {
      const { id } = req.params;
      
      // Buscar o lote pelo ID
      const lote = await Lote.findByPk(id);
      
      if (!lote) {
        return res.status(404).json({
          error: 'Lote não encontrado',
          message: 'O lote solicitado não existe'
        });
      }
      
      // Verificar se existem boletos associados ao lote
      const boletosCount = await Boleto.count({ where: { id_lote: id, ativo: true } });
      
      if (boletosCount > 0) {
        return res.status(400).json({
          error: 'Lote em uso',
          message: `Este lote possui ${boletosCount} boletos associados e não pode ser removido`
        });
      }
      
      // Desativar o lote em vez de excluir (soft delete)
      await lote.update({ ativo: false });
      
      return res.status(200).json({
        message: 'Lote removido com sucesso'
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao remover lote', 
        message: error.message 
      });
    }
  }
  
  /**
   * Cria um novo mapeamento entre lote externo e interno
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com o mapeamento criado
   */
  async criarMapeamento(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { nome_externo, id_lote_interno } = req.body;
      
      // Verificar se o lote interno existe
      const loteInterno = await Lote.findByPk(id_lote_interno, { transaction });
      
      if (!loteInterno) {
        await transaction.rollback();
        return res.status(404).json({
          error: 'Lote não encontrado',
          message: 'O lote interno informado não existe'
        });
      }
      
      // Verificar se já existe um mapeamento com o mesmo nome externo
      const mapeamentoExists = await MapeamentoLote.findOne({ 
        where: { nome_externo },
        transaction
      });
      
      if (mapeamentoExists) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Mapeamento já existe',
          message: 'Já existe um mapeamento para esta unidade externa'
        });
      }
      
      // Criar o mapeamento
      const mapeamento = await MapeamentoLote.create({
        nome_externo,
        id_lote_interno
      }, { transaction });
      
      await transaction.commit();
      
      return res.status(201).json({
        message: 'Mapeamento criado com sucesso',
        mapeamento: {
          ...mapeamento.get(),
          loteInterno: {
            id: loteInterno.id,
            nome: loteInterno.nome
          }
        }
      });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ 
        error: 'Erro ao criar mapeamento', 
        message: error.message 
      });
    }
  }
  
  /**
   * Atualiza um mapeamento existente
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com o mapeamento atualizado
   */
  async atualizarMapeamento(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { nome_externo, id_lote_interno } = req.body;
      
      // Buscar o mapeamento pelo ID
      const mapeamento = await MapeamentoLote.findByPk(id, { transaction });
      
      if (!mapeamento) {
        await transaction.rollback();
        return res.status(404).json({
          error: 'Mapeamento não encontrado',
          message: 'O mapeamento solicitado não existe'
        });
      }
      
      // Verificar se o lote interno existe, se informado
      if (id_lote_interno) {
        const loteInterno = await Lote.findByPk(id_lote_interno, { transaction });
        
        if (!loteInterno) {
          await transaction.rollback();
          return res.status(404).json({
            error: 'Lote não encontrado',
            message: 'O lote interno informado não existe'
          });
        }
      }
      
      // Verificar se já existe outro mapeamento com o mesmo nome externo
      if (nome_externo && nome_externo !== mapeamento.nome_externo) {
        const mapeamentoExists = await MapeamentoLote.findOne({ 
          where: { nome_externo },
          transaction
        });
        
        if (mapeamentoExists) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'Nome duplicado',
            message: 'Já existe outro mapeamento com esta unidade externa'
          });
        }
      }
      
      // Atualizar os campos
      await mapeamento.update({
        nome_externo: nome_externo || mapeamento.nome_externo,
        id_lote_interno: id_lote_interno || mapeamento.id_lote_interno
      }, { transaction });
      
      // Buscar o lote relacionado para incluir na resposta
      const loteInterno = await Lote.findByPk(mapeamento.id_lote_interno, {
        attributes: ['id', 'nome'],
        transaction
      });
      
      await transaction.commit();
      
      return res.status(200).json({
        message: 'Mapeamento atualizado com sucesso',
        mapeamento: {
          ...mapeamento.get(),
          loteInterno: loteInterno
        }
      });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ 
        error: 'Erro ao atualizar mapeamento', 
        message: error.message 
      });
    }
  }
  
  /**
   * Remove um mapeamento
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com confirmação
   */
  async removerMapeamento(req, res) {
    try {
      const { id } = req.params;
      
      // Buscar o mapeamento pelo ID
      const mapeamento = await MapeamentoLote.findByPk(id);
      
      if (!mapeamento) {
        return res.status(404).json({
          error: 'Mapeamento não encontrado',
          message: 'O mapeamento solicitado não existe'
        });
      }
      
      // Excluir o mapeamento (hard delete)
      await mapeamento.destroy();
      
      return res.status(200).json({
        message: 'Mapeamento removido com sucesso'
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao remover mapeamento', 
        message: error.message 
      });
    }
  }
}

module.exports = new LoteController();