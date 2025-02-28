const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    idRole: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Role name cannot be empty' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isSystemRole: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    }

  });

  const roleSchema = Joi.object({
    name: Joi.string()
      .required()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z_]+$/)
      .messages({
        'string.pattern.base': 'Role name must contain only letters and underscores'
      }),
    description: Joi.string().optional().max(255),
    isSystemRole: Joi.boolean().optional(),
    permissions: Joi.array().items(Joi.string()).optional()

  });

  Role.validate = (role) => roleSchema.validate(role);

  Role.associate = (models) => {
    // Many-to-Many relationship with Users
    Role.belongsToMany(models.User, { 
      through: 'UserRoles', 
      foreignKey: 'roleId' 
    });

    // One-to-Many relationship with Etapes
    Role.hasMany(models.Etape, {
      foreignKey: 'roleId',
      as: 'etapes'  // This is the correct alias
    });
  };

  return Role;
};
