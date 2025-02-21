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
      allowNull: true,
      references: {
        model: 'Etape', // name of the target model
        key: 'idEtape' // key in the target model
      }
    },
    status: {
      type: DataTypes.ENUM('verified', 'pending', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['verified', 'pending', 'rejected']]
      }
    },
    transferStatus: {
      type: DataTypes.ENUM('pending', 'sent', 'received', 'viewed'),
      defaultValue: 'pending'
    },
    transferTimestamp: {
      type: DataTypes.DATE,
      allowNull: true
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }
  });

  Document.prototype.checkEtapeCompletion = async function() {
    const etape = await this.getEtape();
    if (!etape) return false;
    
    // Add logic here to check if all required steps are completed
    // This is a placeholder - implement actual verification logic
    return true;
  };

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
