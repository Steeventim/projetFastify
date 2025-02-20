const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DocumentTransfer extends Model {
    static associate(models) {
      DocumentTransfer.belongsTo(models.Document, {
        foreignKey: 'documentId',
        as: 'document'
      });
      DocumentTransfer.belongsTo(models.User, {
        foreignKey: 'senderId',
        as: 'sender'
      });
      DocumentTransfer.belongsTo(models.User, {
        foreignKey: 'recipientId',
        as: 'recipient'
      });
    }
  }

  DocumentTransfer.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'delivered', 'viewed'),
      defaultValue: 'pending'
    },
    viewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'DocumentTransfer',
    timestamps: true
  });

  return DocumentTransfer;
};
