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
    etapeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Etape', // name of the target model
        key: 'idEtape' // key in the target model
      }
    },
    UserDestinatorName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['indexed', 'verified', 'pending', 'rejected']],
          msg: "Status must be one of: indexed, verified, pending, rejected"
        }
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
        isValidUrl(value) {
          if (value === null) return; // Allow null values
          try {
            new URL(value);
          } catch (error) {
            throw new Error('URL must be a valid URL format');
          }
        }
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
