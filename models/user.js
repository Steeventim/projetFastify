const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const passwordComplexity = require('joi-password-complexity');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    idUser: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    NomUser: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Nom User cannot be empty' }
      }
    },
    PrenomUser: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Invalid email format' }
      }
    },
    Password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    Telephone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: {
          args: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
          msg: 'Invalid phone number format'
        }
      }
    },
    LastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        const saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS, 10) || 12;
        const salt = await bcrypt.genSalt(saltRounds);
        user.Password = await bcrypt.hash(user.Password, salt);
      },
      beforeUpdate: async (user) => {
        if (user.changed('Password')) {
          const saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS, 10) || 12;
          const salt = await bcrypt.genSalt(saltRounds);
          user.Password = await bcrypt.hash(user.Password, salt);
        }
      }
    }
  });

  const userSchema = Joi.object({
    NomUser: Joi.string().min(2).max(50).required(),
    PrenomUser: Joi.string().min(2).max(50).optional(),
    Email: Joi.string().email().required(),
    Password: passwordComplexity().required(),
    Telephone: Joi.string()
      .pattern(new RegExp('^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$'))
      .message('Invalid phone number format')
      .required(),
    LastLogin: Joi.date().optional(),
    IsActive: Joi.boolean().optional()
  });

  User.validate = (user) => userSchema.validate(user);

  User.prototype.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.Password);
  };

  User.associate = (models) => {
    User.hasMany(models.Commentaire, { foreignKey: 'userId' });
    User.belongsToMany(models.Role, { through: 'UserRoles', foreignKey: 'userId' });
    User.hasMany(models.Signature, { foreignKey: 'userId' });
    User.belongsTo(models.Structure, { foreignKey: 'structureId' });
  };

  return User;
};
