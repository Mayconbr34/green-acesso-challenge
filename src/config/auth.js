require('dotenv').config();
const jwt = require('jsonwebtoken');

// Configurações do JWT
const authConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRATION || '8h'
};

// Função para gerar token JWT
const generateToken = (payload) => {
  return jwt.sign(payload, authConfig.secret, {
    expiresIn: authConfig.expiresIn
  });
};

// Função para verificar token JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, authConfig.secret);
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
};

module.exports = {
  authConfig,
  generateToken,
  verifyToken
};