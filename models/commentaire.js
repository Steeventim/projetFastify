module.exports = (sequelize, DataTypes) => {
  const Commentaire = sequelize.define('Commentaire', {
    idComment: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Contenu: DataTypes.STRING,
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Documents',
        key: 'idDocument'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'idUser'
      }
    }
  });

  Commentaire.associate = (models) => {
    Commentaire.belongsTo(models.User, { 
      foreignKey: 'userId',
      as: 'user' 
    });
    Commentaire.belongsTo(models.Document, { 
      foreignKey: 'documentId',
      as: 'document',
      onDelete: 'CASCADE'
    });
  };

  return Commentaire;
};