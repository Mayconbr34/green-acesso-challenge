const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  senha: {
    type: DataTypes.STRING(255),
    allowNull: false,
    // Não retornar a senha em consultas
    get() {
      return undefined;
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    // Hash da senha antes de salvar
    beforeCreate: async (user) => {
      if (user.senha) {
        user.senha = await bcrypt.hash(user.senha, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('senha') && user.senha) {
        user.senha = await bcrypt.hash(user.senha, 10);
      }
    }
  }
});

// Método para verificar senha
User.prototype.checkPassword = async function(password) {
  return bcrypt.compare(password, this.getDataValue('senha'));
};

module.exports = User;