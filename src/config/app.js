require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('../routes');
const { notFound, errorHandler } = require('../middlewares/error');
require('express-async-errors');

/**
 * Configuração da aplicação Express
 */
const configureApp = () => {
  const app = express();

  // Configurações de segurança com helmet
  app.use(helmet());

  // Configuração de CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Parser de JSON
  app.use(express.json());

  // Parser de formulários
  app.use(express.urlencoded({ extended: true }));

  // Registrar requisições HTTP
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

  // Servir arquivos estáticos (se necessário)
  app.use('/public', express.static(path.join(__dirname, '../../public')));

  // Rotas API
  app.use('/api', routes);

  // Middleware para rotas não encontradas (404)
  app.use(notFound);

  // Middleware para tratamento de erros
  app.use(errorHandler);

  return app;
};

module.exports = configureApp;