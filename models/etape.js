const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Etape = sequelize.define('Etape', {
    idEtape: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    LibelleEtape: DataTypes.STRING,
    Description: DataTypes.STRING,
    Validation: DataTypes.STRING,
    sequenceNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },

  });

  Etape.associate = (models) => {
    Etape.belongsToMany(models.TypeProjet, { through: 'EtapeTypeProjet', foreignKey: 'etapeId' });
    Etape.hasMany(models.Document, { foreignKey: 'etapeId', as: 'documents' });
    Etape.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
  };


  return Etape;
};
