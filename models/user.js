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
    structureId: {
      type: DataTypes.UUID,
      allowNull: true,  // Allow null if a user might not belong to a structure
      references: {
        model: 'Structures',
        key: 'idStructure'  // Assuming this is your primary key in Structures table
      }
    },
      Password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      resetToken: {
        type: DataTypes.STRING,
        allowNull: true
      },
      resetTokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true
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
        console.log(`Hashing password with salt rounds: ${saltRounds}`);
        const salt = await bcrypt.genSalt(saltRounds);
        console.log(`Generated salt: ${salt}`);
        user.Password = await bcrypt.hash(user.Password, salt);
        console.log(`Hashed password: ${user.Password}`);
      },

      beforeUpdate: async (user) => {
        if (user.changed('Password')) {
          const saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS, 10) || 12;
          console.log(`Updating password with salt rounds: ${saltRounds}`);
          const salt = await bcrypt.genSalt(saltRounds);
          console.log(`Generated salt: ${salt}`);
          user.Password = await bcrypt.hash(user.Password, salt);
          console.log(`Hashed password: ${user.Password}`);
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
    IsActive: Joi.boolean().optional(),
    roleNames: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ).optional()
  });


  User.validate = (user) => userSchema.validate(user);

  User.prototype.comparePassword = async function(candidatePassword) {
    console.log(`Comparing password for user: ${this.Email}`);
    console.log(`Stored hash: ${this.Password}`);
    const isMatch = await bcrypt.compare(candidatePassword, this.Password);
    console.log(`Password match: ${isMatch}`);
    return isMatch;
  };


  User.associate = (models) => {
    User.hasMany(models.Commentaire, { foreignKey: 'userId' });
    User.belongsToMany(models.Role, { through: 'UserRoles', foreignKey: 'userId' });
    User.hasMany(models.Signature, { foreignKey: 'userId' });
    User.belongsTo(models.Structure, { foreignKey: 'structureId' });
  };

  return User;
};
