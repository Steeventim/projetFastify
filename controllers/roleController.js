const { Role, Etape } = require('../models');
const { v4: uuidv4 } = require('uuid'); // Import UUID for unique ID generation

// Create Role
const createRole = async (request, reply) => {
    try {
        let roles = request.body; // Accept an array of roles
        if (!Array.isArray(roles)) {
            roles = [roles]; // Wrap single object in an array
        }

        const createdRoles = []; // Array to hold created roles

        for (const roleData of roles) {
            const { name, description, isSystemRole, etapeName, permissions } = roleData;

            // Validate etapeName
            if (!etapeName) {
                console.error('Etape name is required in request body');
                return reply.status(400).send({ 
                    error: 'etapeName is required',
                    details: 'Please provide a valid etapeName in the request body'
                });
            }

            // Find the etape by name
            const etape = await Etape.findOne({ where: { LibelleEtape: etapeName } });

            if (!etape) {
                console.error(`Etape not found: ${etapeName}`);
                return reply.status(404).send({ 
                    message: 'Etape not found',
                    details: `No etape found with name: ${etapeName}`
                });
            }

            const roleId = uuidv4(); // Generate a unique ID for the role
            const [role, created] = await Role.findOrCreate({
                where: { name },
                defaults: { idRole: roleId, description, isSystemRole, permissions }
            });

            // Update the etape with the roleId
            await etape.update({ roleId: role.idRole });

            createdRoles.push(role); // Add created role to the array
            console.log(`Role created successfully: ${role.name}`);
        }

        reply.code(201).send({
            roles: createdRoles.map(role => role.toJSON()),
            message: 'Roles created successfully'
        });

    } catch (error) {
        console.error('Error creating role:', error);
        reply.code(400).send({ 
            error: error.message,
            details: 'An error occurred while processing the role creation request'
        });
    }
};

// Update Role
const updateRole = async (request, reply) => {
    try {
        const { roleId } = request.params;
        const { name, description, isSystemRole } = request.body;
        const [updated] = await Role.update(
            { name, description, isSystemRole },
            { where: { id: roleId } }
        );

        if (updated) {
            const updatedRole = await Role.findByPk(roleId);
            reply.code(200).send(updatedRole);
        } else {
            reply.code(404).send({ error: 'Role not found' });
        }
    } catch (error) {
        reply.code(400).send({ error: error.message });
    }
};

// Delete Role
const deleteRole = async (request, reply) => {
    try {
        const { roleId } = request.params;
        const deleted = await Role.destroy({
            where: { id: roleId }
        });

        if (deleted) {
            reply.code(204).send();
        } else {
            reply.code(404).send({ error: 'Role not found' });
        }
    } catch (error) {
        reply.code(400).send({ error: error.message });
    }
};

// Get all roles
const getAllRoles = async (request, reply) => {
    try {
        const roles = await Role.findAll();
        reply.code(200).send(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        reply.code(500).send({ 
            error: error.message,
            details: 'An error occurred while fetching roles'
        });
    }
};

module.exports = {
    createRole,
    updateRole,
    deleteRole,
    getAllRoles
};
