const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const TypeProjet = sequelize.define('TypeProjet', {
    idType: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Libelle: {
      type: DataTypes.STRING,
      allowNull: false
    },
    Description: DataTypes.STRING
  });

  TypeProjet.associate = (models) => {
    TypeProjet.belongsToMany(models.Etape, { 
      through: 'EtapeTypeProjet', 
      foreignKey: 'idType',
      otherKey: 'etapeId'
    });
  };

  return TypeProjet;
};
