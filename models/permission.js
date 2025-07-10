// models/permission.js
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    idPermission: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    LibellePerm: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Permissions',
    timestamps: true
  });

  Permission.associate = function(models) {
    Permission.belongsToMany(models.Role, {
      through: 'RolePermissions',
      foreignKey: 'permissionId',
      otherKey: 'roleId'
    });
  };

  return Permission;
};
