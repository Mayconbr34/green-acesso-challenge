const Boleto = require('../database/models/Boleto');
const Lote = require('../database/models/Lote');
const pdfService = require('./pdfService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Serviço para geração de relatórios
 */
class ReportService {
  /**
   * Busca boletos com base em filtros e opcionalmente gera um relatório em PDF
   * 
   * @param {Object} filtros - Filtros para a busca de boletos
   * @param {boolean} gerarRelatorio - Indica se deve gerar um relatório em PDF
   * @returns {Promise<Object>} - Resultados da busca e relatório se solicitado
   */
  async getBoletos(filtros = {}, gerarRelatorio = false) {
    try {
      // Construir condições de busca com base nos filtros
      const where = { ativo: true };
      
      if (filtros.nome) {
        where.nome_sacado = { [Op.like]: `%${filtros.nome}%` };
      }
      
      if (filtros.id_lote) {
        where.id_lote = filtros.id_lote;
      }
      
      // Filtros de valores
      if (filtros.valor_inicial || filtros.valor_final) {
        where.valor = {};
        
        if (filtros.valor_inicial) {
          where.valor[Op.gte] = parseFloat(filtros.valor_inicial);
        }
        
        if (filtros.valor_final) {
          where.valor[Op.lte] = parseFloat(filtros.valor_final);
        }
      }
      
      // Buscar boletos com as condições definidas
      const boletos = await Boleto.findAll({
        where,
        include: [
          {
            model: Lote,
            as: 'lote',
            attributes: ['nome']
          }
        ],
        order: [['id', 'ASC']]
      });
      
      // Retornar apenas os dados necessários (sem dados sensíveis)
      const boletosFiltrados = boletos.map(boleto => ({
        id: boleto.id,
        nome_sacado: boleto.nome_sacado,
        id_lote: boleto.id_lote,
        lote: boleto.lote,
        valor: boleto.valor,
        linha_digitavel: boleto.linha_digitavel,
        pdf_path: boleto.pdf_path,
        criado_em: boleto.criado_em
      }));
      
      // Se requisitado relatório, gerar PDF
      if (gerarRelatorio) {
        const pdfBase64 = await pdfService.gerarRelatorioPDF(boletosFiltrados, filtros);
        
        return {
          total: boletosFiltrados.length,
          relatorio: true,
          base64: pdfBase64
        };
      }
      
      // Caso contrário, retornar apenas os dados filtrados
      return {
        total: boletosFiltrados.length,
        boletos: boletosFiltrados
      };
    } catch (error) {
      throw new Error(`Erro ao buscar boletos: ${error.message}`);
    }
  }
  
  /**
   * Gera estatísticas básicas dos boletos no sistema
   * 
   * @returns {Promise<Object>} - Estatísticas dos boletos
   */
  async getEstatisticas() {
    try {
      // Total de boletos
      const totalBoletos = await Boleto.count({ where: { ativo: true } });
      
      // Soma dos valores (com valor padrão para null/undefined)
      const valorTotal = await Boleto.sum('valor', { where: { ativo: true } }) || 0;
      
      // Obter média de valor por lote
      const mediaPorLote = await Boleto.findAll({
        attributes: [
          'id_lote',
          [sequelize.fn('AVG', sequelize.col('valor')), 'media_valor'],
          [sequelize.fn('COUNT', sequelize.col('Boleto.id')), 'total_boletos'] // Especificando a tabela Boleto
        ],
        where: { ativo: true },
        group: ['id_lote'],
        include: [
          {
            model: Lote,
            as: 'lote',
            attributes: ['nome']
          }
        ]
      });
      
      return {
        total_boletos: totalBoletos,
        valor_total: valorTotal,
        media_por_lote: mediaPorLote.map(item => ({
          id_lote: item.id_lote,
          nome_lote: item.lote?.nome || 'Lote não encontrado',
          media_valor: parseFloat(item.getDataValue('media_valor') || 0),
          total_boletos: parseInt(item.getDataValue('total_boletos') || 0)
        }))
      };
    } catch (error) {
      console.error('Erro completo:', error);
      throw new Error(`Erro ao gerar estatísticas: ${error.message}`);
    }
  }
}

module.exports = new ReportService();