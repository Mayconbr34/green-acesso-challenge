const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const PDFKit = require('pdfkit');
const Boleto = require('../database/models/Boleto');
const Lote = require('../database/models/Lote');

/**
 * Serviço para manipulação de arquivos PDF
 */
class PdfService {
  /**
   * Divide um arquivo PDF de boletos em múltiplos PDFs individuais
   * 
   * @param {string} filePath - Caminho do arquivo PDF original
   * @returns {Promise<Object>} - Resultado da divisão
   */
  async splitPdfBoletos(filePath) {
    try {
      // Carregar arquivo PDF
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // Total de páginas
      const totalPages = pdfDoc.getPageCount();
      
      // Obter boletos ordenados por id para mapeamento com páginas
      const boletos = await Boleto.findAll({
        where: { ativo: true },
        order: [['id', 'ASC']]
      });
      
      // Verificar se o número de boletos corresponde ao número de páginas
      if (boletos.length !== totalPages) {
        throw new Error(`Número de boletos (${boletos.length}) não corresponde ao número de páginas do PDF (${totalPages})`);
      }
      
      const outputDir = path.resolve(process.env.OUTPUT_DIR || './output', 'boletos');
      
      // Garantir que o diretório de saída existe
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Dividir o PDF por páginas e salvar cada uma com o ID do boleto
      const results = [];
      
      for (let i = 0; i < totalPages; i++) {
        const boleto = boletos[i];
        
        // Criar um novo PDF com apenas uma página
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(page);
        
        // Salvar o novo PDF com o ID do boleto
        const outputPath = path.join(outputDir, `${boleto.id}.pdf`);
        const pdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, pdfBytes);
        
        // Atualizar o caminho do PDF no registro do boleto
        await boleto.update({ pdf_path: outputPath });
        
        results.push({
          boletoId: boleto.id,
          outputPath: outputPath,
          success: true
        });
      }
      
      return {
        success: true,
        total: totalPages,
        processados: results.length,
        detalhes: results
      };
    } catch (error) {
      throw new Error(`Erro ao processar arquivo PDF: ${error.message}`);
    }
  }

  /**
   * Gera um relatório em PDF com a lista de boletos
   * 
   * @param {Array} boletos - Lista de boletos para incluir no relatório
   * @param {Object} filtros - Filtros aplicados na consulta
   * @returns {Promise<Buffer>} - Buffer contendo o PDF gerado
   */
  async gerarRelatorioPDF(boletos, filtros = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Criar um novo documento PDF
        const doc = new PDFKit();
        
        // Buffer para armazenar o PDF
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          
          // Converter para base64 e resolver a promessa
          const base64 = pdfBuffer.toString('base64');
          resolve(base64);
        });
        
        // Adicionar título
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Relatório de Boletos - Condomínio Green Park', {
             align: 'center'
           })
           .moveDown();
        
        // Adicionar informações dos filtros
        if (Object.keys(filtros).length > 0) {
          doc.fontSize(10)
             .font('Helvetica-Oblique')
             .text('Filtros aplicados:', { underline: true })
             .moveDown(0.5);
          
          for (const [key, value] of Object.entries(filtros)) {
            if (value) {
              let label = key;
              switch (key) {
                case 'nome':
                  label = 'Nome do sacado';
                  break;
                case 'id_lote':
                  label = 'ID do lote';
                  break;
                case 'valor_inicial':
                  label = 'Valor inicial';
                  break;
                case 'valor_final':
                  label = 'Valor final';
                  break;
              }
              doc.text(`${label}: ${value}`);
            }
          }
          doc.moveDown();
        }
        
        // Adicionar data de geração
        doc.fontSize(10)
           .text(`Data do relatório: ${new Date().toLocaleString('pt-BR')}`)
           .moveDown();
        
        // Definir cabeçalhos da tabela
        const headers = ['ID', 'Nome do Sacado', 'Lote', 'Valor (R$)', 'Linha Digitável'];
        const columnWidths = [40, 160, 40, 70, 220];
        const startX = 50;
        let currentY = doc.y;
        
        // Desenhar cabeçalho da tabela
        doc.font('Helvetica-Bold')
           .fontSize(10);
        
        let currentX = startX;
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], currentX, currentY, {
            width: columnWidths[i],
            align: i === 1 ? 'left' : i === 3 ? 'right' : 'center'
          });
          currentX += columnWidths[i];
        }
        
        // Linha horizontal após o cabeçalho
        currentY = doc.y + 5;
        doc.moveTo(startX, currentY)
           .lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), currentY)
           .stroke();
        
        // Adicionar linhas da tabela com dados dos boletos
        doc.font('Helvetica').fontSize(9);
        
        for (const boleto of boletos) {
          currentY = doc.y + 10;
          
          // Verificar se é necessário criar uma nova página
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
          
          // Formatar valor
          const valorFormatado = boleto.valor.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          
          // Formatar linha digitável para exibição (grupos de 5)
          let linhaDigitavel = boleto.linha_digitavel;
          if (linhaDigitavel.length > 40) {
            linhaDigitavel = linhaDigitavel.substring(0, 40) + '...';
          }
          
          // Escrever dados do boleto
          currentX = startX;
          doc.text(boleto.id.toString(), currentX, currentY, {
            width: columnWidths[0],
            align: 'center'
          });
          currentX += columnWidths[0];
          
          doc.text(boleto.nome_sacado, currentX, currentY, {
            width: columnWidths[1],
            align: 'left'
          });
          currentX += columnWidths[1];
          
          doc.text(boleto.lote?.nome || boleto.id_lote.toString(), currentX, currentY, {
            width: columnWidths[2],
            align: 'center'
          });
          currentX += columnWidths[2];
          
          doc.text(valorFormatado, currentX, currentY, {
            width: columnWidths[3],
            align: 'right'
          });
          currentX += columnWidths[3];
          
          doc.text(linhaDigitavel, currentX, currentY, {
            width: columnWidths[4],
            align: 'left'
          });
          
          // Atualizar posição vertical para a próxima linha
          doc.y = currentY + 15;
        }
        
        // Adicionar linha horizontal final
        doc.moveTo(startX, doc.y)
           .lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), doc.y)
           .stroke();
        
        // Adicionar rodapé com contagens
        doc.moveDown()
           .fontSize(10)
           .text(`Total de boletos: ${boletos.length}`, {
             align: 'right'
           });
        
        // Finalizar documento
        doc.end();
      } catch (error) {
        reject(new Error(`Erro ao gerar relatório PDF: ${error.message}`));
      }
    });
  }
  
  /**
   * Cria um arquivo PDF de exemplo para testes
   * 
   * @param {Array} nomes - Lista de nomes para criar páginas de boletos
   * @param {string} outputPath - Caminho de saída do arquivo
   * @returns {Promise<string>} - Caminho do arquivo gerado
   */
  async criarPdfExemplo(nomes, outputPath = './output/boletos_exemplo.pdf') {
    return new Promise((resolve, reject) => {
      try {
        // Garantir que o diretório de saída existe
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Criar documento PDF
        const doc = new PDFKit();
        const writeStream = fs.createWriteStream(outputPath);
        
        // Configurar eventos de stream
        writeStream.on('finish', () => {
          resolve(outputPath);
        });
        
        writeStream.on('error', (err) => {
          reject(new Error(`Erro ao salvar PDF exemplo: ${err.message}`));
        });
        
        // Pipe do documento para o stream
        doc.pipe(writeStream);
        
        // Adicionar uma página para cada nome
        for (let i = 0; i < nomes.length; i++) {
          if (i > 0) {
            doc.addPage();
          }
          
          // Título da página
          doc.fontSize(24)
             .font('Helvetica-Bold')
             .text('BOLETO DE PAGAMENTO', {
               align: 'center'
             })
             .moveDown();
          
          // Adicionar um retângulo como "boleto"
          doc.rect(50, 150, 500, 300)
             .stroke();
          
          // Informações do boleto
          doc.fontSize(16)
             .text(`Sacado: ${nomes[i]}`, 70, 180)
             .moveDown();
          
          doc.fontSize(14)
             .text('Condomínio Green Park', 70, 230)
             .moveDown();
          
          // Linha digitável fictícia
          doc.fontSize(12)
             .text('Linha Digitável:', 70, 280)
             .text('12345.67890 12345.678901 12345.678901 1 12345678901234', 70, 300)
             .moveDown();
          
          // Valor
          const valorAleatorio = (Math.random() * 500 + 100).toFixed(2);
          doc.fontSize(16)
             .text(`Valor: R$ ${valorAleatorio}`, 70, 350)
             .moveDown();
          
          // Código de barras simulado (apenas uma linha preta)
          doc.rect(70, 400, 460, 30)
             .fill('black');
        }
        
        // Finalizar documento
        doc.end();
      } catch (error) {
        reject(new Error(`Erro ao criar PDF exemplo: ${error.message}`));
      }
    });
  }
}

module.exports = new PdfService();