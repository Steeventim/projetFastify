const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Structure = sequelize.define('Structure', {
    idStructure: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    NomStructure: DataTypes.STRING,
    DescriptionStructure: DataTypes.STRING,
  });

  Structure.associate = (models) => {
    Structure.hasMany(models.User, { foreignKey: 'structureId' });
  };

  return Structure;
};