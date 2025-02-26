const { User, Role, UserRoles } = require('../models');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const initializationController = {
  async createAdmin(request, reply) {
    try {
      const { email, password, nomUser, prenomUser, telephone } = request.body;

      // Validate superadmin authorization
      if (!request.user?.isSuperAdmin) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Only SuperAdmin can create General Admin'
        });
      }

      // Create or get admin role
      const [adminRole] = await Role.findOrCreate({
        where: { name: 'admin' },
        defaults: {
          idRole: uuidv4(),
          description: 'General Administrator',
          isSystemRole: true
        }
      });

      // Create admin user
      const adminUser = await User.create({
        idUser: uuidv4(),
        Email: email,
        Password: password,
        NomUser: nomUser,
        PrenomUser: prenomUser,
        Telephone: telephone,
        IsActive: true
      });


      // Associate user with role using the UserRoles model
      await UserRoles.create({
        id: uuidv4(),
        userId: adminUser.idUser,
        roleId: adminRole.idRole
      });

      return reply.code(201).send({
        statusCode: 201,
        message: 'General Admin created successfully',
        admin: {
          email: adminUser.Email,
          nom: adminUser.NomUser,
          prenom: adminUser.PrenomUser,
          telephone: adminUser.Telephone,
          role: 'admin'
        }
      });

    } catch (error) {
      console.error('Create admin error:', error);
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = initializationController;
