module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    idDocument: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Title: DataTypes.STRING,
  });

  Document.associate = (models) => {
    Document.hasMany(models.Commentaire, { foreignKey: 'documentId' });
  };

  return Document;
};