module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    idDocument: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Title: {
      type: DataTypes.TEXT,
      allowNull: true
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
  }, {
    hooks: {
      beforeCreate: async (document, options) => {
        if (!document.etapeId) {
          // Find the first etape by sequence number
          const firstEtape = await sequelize.models.Etape.findOne({
            order: [['sequenceNumber', 'ASC']],
            transaction: options.transaction
          });

          if (firstEtape) {
            document.etapeId = firstEtape.idEtape;
          }
        }
      }
    }
  });

  Document.prototype.checkEtapeCompletion = async function() {
    try {
      // 1. Get current etape with its TypeProjet
      const etape = await this.getEtape({
        include: [{
          model: sequelize.models.TypeProjet,
          as: 'typeProjets',
          attributes: ['idType', 'Libelle']
        }]
      });

      if (!etape) return false;

      // 2. Get all etapes for this TypeProjet
      const typeProjetId = etape.typeProjets[0]?.idType;
      if (!typeProjetId) return false;

      const allEtapes = await sequelize.models.Etape.findAll({
        include: [{
          model: sequelize.models.TypeProjet,
          as: 'typeProjets',
          where: { idType: typeProjetId }
        }],
        order: [['sequenceNumber', 'ASC']]
      });

      // 3. Check if current etape is the last one and validation status
      const maxSequence = Math.max(...allEtapes.map(e => e.sequenceNumber));
      const isComplete = (
        etape.sequenceNumber === maxSequence && 
        (!etape.Validation || this.status !== 'rejected')
      );

      return isComplete;

    } catch (error) {
      console.error('Error checking etape completion:', error);
      return false;
    }
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
