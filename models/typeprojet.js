const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const TypeProjet = sequelize.define('TypeProjet', {
    idTypeProjet: {  // Changed from idType to idTypeProjet
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
      foreignKey: 'typeProjetId',  // Changed from typeId to typeProjetId
      otherKey: 'etapeId'
    });
  };

  return TypeProjet;
};