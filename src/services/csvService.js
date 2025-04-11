const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Boleto = require('../database/models/Boleto');
const MapeamentoLote = require('../database/models/MapeamentoLote');
const { sequelize } = require('../config/database');

/**
 * Serviço para processar arquivos CSV de boletos
 */
class CsvService {
  /**
   * Processa um arquivo CSV de boletos e importa para o banco de dados
   * 
   * @param {string} filePath - Caminho do arquivo CSV
   * @returns {Promise<Object>} - Resultado da importação
   */
  async processBoletosCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      
      fs.createReadStream(filePath)
        .pipe(csv({
          separator: ';',
          skipLines: 0,
          headers: ['nome', 'unidade', 'valor', 'linha_digitavel']
        }))
        .on('data', (data) => {
          // Validar e preparar dados
          const boletoData = {
            nome_sacado: data.nome,
            unidade_externa: data.unidade,
            valor: parseFloat(data.valor.replace(',', '.')),
            linha_digitavel: data.linha_digitavel
          };
          
          results.push(boletoData);
        })
        .on('error', (error) => {
          reject(new Error(`Erro ao processar arquivo CSV: ${error.message}`));
        })
        .on('end', async () => {
          try {
            // Importar boletos no banco de dados
            const importResult = await this.importBoletosToDatabase(results);
            resolve(importResult);
          } catch (error) {
            reject(error);
          }
        });
    });
  }

  /**
   * Importa boletos para o banco de dados com mapeamento de lotes
   * 
   * @param {Array} boletos - Lista de boletos extraídos do CSV
   * @returns {Promise<Object>} - Estatísticas da importação
   */
  async importBoletosToDatabase(boletos) {
    const transaction = await sequelize.transaction();
    
    try {
      let importados = 0;
      let falhas = 0;
      const erros = [];
      
      // Para cada boleto do CSV
      for (const boleto of boletos) {
        try {
          // Buscar o mapeamento do lote
          const mapeamento = await MapeamentoLote.findOne({
            where: { nome_externo: boleto.unidade_externa },
            transaction
          });
          
          if (!mapeamento) {
            falhas++;
            erros.push(`Lote não encontrado para unidade externa: ${boleto.unidade_externa}`);
            continue;
          }
          
          // Criar o boleto com o id do lote interno correto
          await Boleto.create({
            nome_sacado: boleto.nome_sacado,
            id_lote: mapeamento.id_lote_interno,
            valor: boleto.valor,
            linha_digitavel: boleto.linha_digitavel,
            ativo: true
          }, { transaction });
          
          importados++;
        } catch (error) {
          falhas++;
          erros.push(`Erro ao processar boleto para ${boleto.nome_sacado}: ${error.message}`);
        }
      }
      
      // Commit da transação
      await transaction.commit();
      
      return {
        total: boletos.length,
        importados,
        falhas,
        erros: erros.length > 0 ? erros : null
      };
    } catch (error) {
      // Rollback em caso de erro
      await transaction.rollback();
      throw new Error(`Erro ao importar boletos: ${error.message}`);
    }
  }
}

module.exports = new CsvService();