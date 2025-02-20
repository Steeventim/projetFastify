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
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    thumbnailPath: {
      type: DataTypes.STRING,
      allowNull: true
    }

  });

  File.associate = (models) => {
    File.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
  };

  return File;
};
