module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
    idFile: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Documents',
        key: 'idDocument'
      }
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidMimeType(value) {
          const uploadConfig = require('../config/upload');
          if (!uploadConfig.isAllowedMimeType(value)) {
            throw new Error('Invalid file type');
          }
        }
      }
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isValidSize(value) {
          const uploadConfig = require('../config/upload');
          const extension = uploadConfig.getExtension(this.fileType)?.slice(1);
          if (extension && value > uploadConfig.FILE_SIZE_LIMITS[extension]) {
            throw new Error(`File size exceeds limit of ${uploadConfig.getHumanReadableSize(uploadConfig.FILE_SIZE_LIMITS[extension])}`);
          }
        }
      }
    },
    thumbnailPath: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    hooks: {
      beforeDestroy: async (file) => {
        // Clean up physical files when record is deleted
        const fileHandler = require('../services/fileHandler');
        await fileHandler.deleteFile(file.filePath, file.thumbnailPath);
      }
    }
  });

  File.associate = (models) => {
    File.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
  };

  return File;
};
