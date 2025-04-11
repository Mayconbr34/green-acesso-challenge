const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Lote = require('./Lote');

const Boleto = sequelize.define('Boleto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nome_sacado: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  id_lote: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Lote',
      key: 'id'
    }
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  linha_digitavel: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  pdf_path: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'boletos',
  timestamps: true
});

// Definir relação com Lote
Boleto.belongsTo(Lote, { foreignKey: 'id_lote', as: 'lote' });

module.exports = Boleto;