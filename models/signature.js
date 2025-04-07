const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");

module.exports = (sequelize, DataTypes) => {
  const Signature = sequelize.define("Signature", {
    idSignature: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    Signature: DataTypes.STRING,
    Date: DataTypes.DATE,
  });

  Signature.associate = (models) => {
    Signature.belongsTo(models.User, { foreignKey: "userId" });
  };

  return Signature;
};
