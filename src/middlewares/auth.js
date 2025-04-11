const { verifyToken } = require('../config/auth');
const User = require('../database/models/User');

// Middleware para verificar autenticação via JWT
const authenticate = async (req, res, next) => {
  try {
    // Obter token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Não autorizado', 
        message: 'Token de autenticação não fornecido' 
      });
    }

    // Verificar formato do token (Bearer token)
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
      return res.status(401).json({ 
        error: 'Erro de token', 
        message: 'Formato de token inválido' 
      });
    }

    const [scheme, token] = parts;
    
    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ 
        error: 'Erro de token', 
        message: 'Formato de token inválido' 
      });
    }

    // Verificar validade do token
    const decoded = verifyToken(token);
    
    // Verificar se o usuário ainda existe e está ativo
    const user = await User.findOne({ 
      where: { 
        id: decoded.id,
        ativo: true 
      }
    });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Não autorizado', 
        message: 'Usuário não encontrado ou inativo' 
      });
    }

    // Adicionar usuário decodificado à requisição
    req.user = decoded;
    
    return next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Não autorizado', 
      message: error.message 
    });
  }
};

// Middleware para verificar permissões de admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acesso proibido', 
      message: 'Permissão de administrador necessária' 
    });
  }
  
  return next();
};

module.exports = {
  authenticate,
  isAdmin
};