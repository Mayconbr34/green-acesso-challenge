require('dotenv').config();
const configureApp = require('./config/app');
const { sequelize, testConnection } = require('./config/database');
const fs = require('fs');
const path = require('path');

// Criar diretórios necessários para a aplicação
const createDirectories = () => {
  const dirs = [
    path.join(__dirname, '../uploads/csv'),
    path.join(__dirname, '../uploads/pdf'),
    path.join(__dirname, '../uploads/originals'),
    path.join(__dirname, '../output/boletos')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Diretório criado: ${dir}`);
    }
  });
};

// Iniciar o servidor
const startServer = async () => {
  try {
    // Criar diretórios necessários
    createDirectories();
    
    // Testar conexão com o banco de dados
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('Erro ao conectar ao banco de dados. Encerrando aplicação.');
      process.exit(1);
    }
    
    // Sincronizar modelos com o banco de dados (em desenvolvimento)
    if (process.env.NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Modelos sincronizados com o banco de dados.');
    }
    
    // Configurar a aplicação Express
    const app = configureApp();
    
    // Definir a porta
    const PORT = process.env.PORT || 3000;
    
    // Iniciar o servidor HTTP
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV}`);
      console.log(`URL da API: ${process.env.API_URL || `http://localhost:${PORT}`}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

// Iniciar a aplicação
startServer();

// Tratamento de erros não capturados e rejeições de promessas
process.on('uncaughtException', (error) => {
  console.error('Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejeição de promessa não tratada:', reason);
});