module.exports = (sequelize, DataTypes) => {
  const Commentaire = sequelize.define('Commentaire', {
    idComment: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Contenu: DataTypes.STRING,
  });

  Commentaire.associate = (models) => {
    Commentaire.belongsTo(models.User, { foreignKey: 'userId' });
    Commentaire.belongsTo(models.Document, { foreignKey: 'documentId' });
  };

  return Commentaire;
};