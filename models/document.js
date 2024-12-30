module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    idDocument: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Title: { // Ensure this matches the actual column name in your database
      type: DataTypes.STRING,
      allowNull: false
    },
    status: { // Ensure this matches the actual column name in your database
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active' // Provide a default value if applicable
    }
  });

  Document.associate = (models) => {
    Document.hasMany(models.Commentaire, { foreignKey: 'documentId' });
  };

  return Document;
};