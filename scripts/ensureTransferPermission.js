const { Role, Permission, RolePermissions, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function ensureTransferPermission() {
  const t = await sequelize.transaction();
  try {
    const [perm, created] = await Permission.findOrCreate({
      where: { LibellePerm: 'Transférer' },
      defaults: { idPermission: uuidv4(), LibellePerm: 'Transférer', Description: 'Permission to transfer documents' },
      transaction: t
    });

    const roles = await Role.findAll({ transaction: t });
    for (const role of roles) {
      // Check existing role-permission mapping
      const existing = await RolePermissions.findOne({ where: { roleId: role.idRole, permissionId: perm.idPermission }, transaction: t });
      if (!existing) {
        await RolePermissions.create({ id: uuidv4(), roleId: role.idRole, permissionId: perm.idPermission }, { transaction: t });
        console.log(`Assigned 'Transférer' to role ${role.name}`);
      } else {
        console.log(`Role ${role.name} already has 'Transférer'`);
      }
    }

    await t.commit();
    console.log('✅ EnsureTransferPermission completed');
  } catch (e) {
    await t.rollback();
    console.error('Error ensuring Transférer permission:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  ensureTransferPermission().then(() => process.exit(0));
}

module.exports = ensureTransferPermission;
