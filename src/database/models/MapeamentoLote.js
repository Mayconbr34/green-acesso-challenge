const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Lote = require('./Lote');

const MapeamentoLote = sequelize.define('MapeamentoLote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nome_externo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  id_lote_interno: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Lote',
      key: 'id'
    }
  }
}, {
  tableName: 'mapeamento_lotes',
  timestamps: true,
  updatedAt: false
});

// Definir relação com Lote
MapeamentoLote.belongsTo(Lote, { foreignKey: 'id_lote_interno', as: 'loteInterno' });

module.exports = MapeamentoLote;