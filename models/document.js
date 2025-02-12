module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    idDocument: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.JSON, 
      allowNull: false
    },
    etapeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Etape', // name of the target model
        key: 'idEtape' // key in the target model
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'
    }
  });

  Document.associate = (models) => {
    Document.hasMany(models.Commentaire, { 
      foreignKey: 'documentId', 
      as: 'commentaires',
      onDelete: 'CASCADE'
    });
    Document.hasMany(models.File, { 
      foreignKey: 'documentId', 
      as: 'files',
      onDelete: 'CASCADE'
    });
    Document.belongsTo(models.Etape, {
      foreignKey: 'etapeId',
      as: 'etape'
    });
  };

  return Document;
};