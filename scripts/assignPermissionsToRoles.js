const { Role } = require('../models');

async function assignPermissions() {
  try {
    // Define permissions to assign
    const permissionsToAssign = ['Valider', 'Rechercher', 'Transférer', 'Rejeter'];

    // Example: Assign permissions to a role named 'user'
    const role = await Role.findOne({ where: { name: 'user' } });
    if (!role) {
      console.log('Role "user" not found');
      return;
    }

    // Update role permissions
    role.permissions = Array.from(new Set([...(role.permissions || []), ...permissionsToAssign]));
    await role.save();

    console.log(`Permissions ${permissionsToAssign.join(', ')} assigned to role "user"`);
  } catch (error) {
    console.error('Error assigning permissions:', error);
  }
}

assignPermissions();
