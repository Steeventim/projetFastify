const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Etape = sequelize.define('Etape', {
    idEtape: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    LibelleEtape: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },

    Description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Validation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sequenceNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  Etape.associate = (models) => {
    Etape.hasMany(models.Document, {
      foreignKey: 'etapeId',
      as: 'documents',
      onDelete: 'SET NULL'
    });
    
    Etape.belongsToMany(models.TypeProjet, {
      through: models.EtapeTypeProjet,
      foreignKey: 'etapeId',
      otherKey: 'idType',
      as: 'typeProjets'
    });
  };

  return Etape;
};
