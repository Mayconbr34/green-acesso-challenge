const User = require('../database/models/User');
const { generateToken } = require('../config/auth');
const { validationResult } = require('express-validator');

/**
 * Controlador para autenticação de usuários
 */
class AuthController {
  /**
   * Login de usuário
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com token JWT
   */
  async login(req, res) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, senha } = req.body;

      // Buscar o usuário pelo e-mail
      const user = await User.findOne({ 
        where: { 
          email, 
          ativo: true 
        } 
      });

      // Verificar se o usuário existe
      if (!user) {
        return res.status(401).json({ 
          error: 'Falha na autenticação', 
          message: 'E-mail ou senha inválidos' 
        });
      }

      // Verificar a senha (o método checkPassword está no modelo User)
      const passwordIsValid = await user.checkPassword(senha);
      if (!passwordIsValid) {
        return res.status(401).json({ 
          error: 'Falha na autenticação', 
          message: 'E-mail ou senha inválidos' 
        });
      }

      // Gerar token JWT
      const token = generateToken({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      });

      // Retornar token e dados básicos do usuário
      return res.status(200).json({
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro no servidor', 
        message: error.message 
      });
    }
  }

  /**
   * Obtém informações do usuário logado
   * 
   * @param {Request} req - Objeto de requisição Express
   * @param {Response} res - Objeto de resposta Express
   * @returns {Response} - Resposta com dados do usuário
   */
  async me(req, res) {
    try {
      // O usuário já foi carregado no middleware de autenticação
      const userId = req.user.id;

      // Buscar dados atualizados do usuário
      const user = await User.findByPk(userId, {
        attributes: ['id', 'nome', 'email', 'role', 'criado_em']
      });

      if (!user) {
        return res.status(404).json({ 
          error: 'Usuário não encontrado', 
          message: 'O usuário não existe ou foi desativado' 
        });
      }

      return res.status(200).json({ user });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro no servidor', 
        message: error.message 
      });
    }
  }


  /**
 * Registra um novo usuário (apenas admin pode criar)
 * 
 * @param {Request} req - Objeto de requisição Express
 * @param {Response} res - Objeto de resposta Express
 * @returns {Response} - Resposta com dados do usuário criado
 */
async register(req, res) {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { nome, email, senha, role } = req.body;
  
      // Verificar se o e-mail já está em uso
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return res.status(400).json({ 
          error: 'E-mail já cadastrado', 
          message: 'Este e-mail já está em uso por outro usuário' 
        });
      }
  
      // Criptografar a senha manualmente
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);
  
      // Criar o usuário com a senha criptografada
      const user = await User.create({
        nome,
        email,
        senha: senhaHash,
        role: role || 'user',
        ativo: true
      });
  
      // Retornar dados do usuário criado (sem a senha)
      return res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro no servidor', 
        message: error.message 
      });
    }
  }
}

module.exports = new AuthController();