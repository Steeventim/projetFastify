const { Role, Etape } = require('../models');

// Create Role
const createRole = async (request, reply) => {
    try {
        const { name, description, isSystemRole, etapeName, permissions } = request.body;

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

        const roleData = {
            name,
            description,
            isSystemRole,
            permissions
        };

        const [role, created] = await Role.findOrCreate({
            where: { name },
            defaults: roleData
        });
        
        // Update the etape with the roleId
        await etape.update({ roleId: role.idRole });

        console.log(`Role created successfully: ${role.name}`);
        reply.code(201).send({
            ...role.toJSON(),
            message: 'Role created successfully'
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

module.exports = {
    createRole,
    updateRole,
    deleteRole
};
