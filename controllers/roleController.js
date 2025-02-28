const { Role, Etape, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid'); // Import UUID for unique ID generation

// Create Role
const createRole = async (request, reply) => {
    const t = await sequelize.transaction();

    try {
        let roles = Array.isArray(request.body) ? request.body : [request.body];
        const createdRoles = [];

        for (const roleData of roles) {
            const { name, description, isSystemRole, etapeName, permissions } = roleData;

            // 1. Validate etapeName
            if (!etapeName) {
                await t.rollback();
                return reply.status(400).send({ 
                    error: 'etapeName is required'
                });
            }

            // 2. Find the etape first
            const etape = await Etape.findOne({ 
                where: { LibelleEtape: etapeName },
                transaction: t
            });

            if (!etape) {
                await t.rollback();
                return reply.status(404).send({ 
                    message: `Etape not found: ${etapeName}`
                });
            }

            // 3. Create the role
            const roleId = uuidv4();
            const [role, created] = await Role.findOrCreate({
                where: { name },
                defaults: { 
                    idRole: roleId, 
                    description, 
                    isSystemRole, 
                    permissions 
                },
                transaction: t
            });

            // 4. Update etape with the new role ID
            await etape.update({ 
                roleId: role.idRole 
            }, { 
                transaction: t,
                where: { idEtape: etape.idEtape }
            });

            // 5. Get fresh role data with etape
            const roleWithEtape = await Role.findOne({
                where: { idRole: role.idRole },
                include: [{
                    model: Etape,
                    as: 'etapes',
                    attributes: ['idEtape', 'LibelleEtape']
                }],
                transaction: t
            });

            createdRoles.push(roleWithEtape);
        }

        await t.commit();

        return reply.code(201).send({
            success: true,
            message: `Successfully created ${createdRoles.length} role(s)`,
            roles: createdRoles
        });

    } catch (error) {
        await t.rollback();
        console.error('Error creating role:', error);
        return reply.code(500).send({ 
            error: 'Internal Server Error',
            message: error.message
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
