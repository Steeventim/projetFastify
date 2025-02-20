const { User, Role, Permission, UserRoles } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const validator = require('validator');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); 

const userController = {
  async getAllUsers(request, reply) {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['Password'] },
        include: [{
          model: Role,
          through: 'UserRoles',
          attributes: ['name']
        }]
      });
      return reply.send(users);
    } catch (error) {
      return reply.status(500).send({ 
        statusCode: 500, 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  },

  async getUserById(request, reply) {
    try {
      const { id } = request.params;
      
      if (!validator.isUUID(id)) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Bad Request', 
          message: 'Invalid user ID' 
        });
      }

      const user = await User.findByPk(id, {
        attributes: { exclude: ['Password'] },
        include: [{
          model: Role,
          through: 'UserRoles',
          attributes: ['name']
        }]
      });

      if (!user) {
        return reply.status(404).send({ 
          statusCode: 404, 
          error: 'Not Found', 
          message: 'User not found' 
        });
      }

      return reply.send(user);
    } catch (error) {
      return reply.status(500).send({ 
        statusCode: 500, 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  },

  async createUser(request, reply) {
    try {
      const { error, value } = User.validate(request.body);
      
      if (error) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Validation Error', 
          message: error.details[0].message 
        });
      }

      const existingUser = await User.findOne({ 
        where: { Email: value.Email } 
      });

      if (existingUser) {
        return reply.status(409).send({ 
          statusCode: 409, 
          error: 'Conflict', 
          message: 'Email already in use' 
        });
      }

      const newUser = await User.create(value);

      // Get roles from either roles or roleNames parameter
      const rolesParam = value.roles || value.roleNames;
      
      // Assign roles if provided - accepts both single role string and array of roles
      if (rolesParam) {
        // Convert single role to array if needed
        const rolesToAssign = Array.isArray(rolesParam) ? rolesParam : [rolesParam];

        
        const roles = await Role.findAll({
          where: {
            name: rolesToAssign
          }
        });

        // Verify all requested roles exist
        if (roles.length !== rolesToAssign.length) {
          const foundRoleNames = roles.map(role => role.name);
          const missingRoles = rolesToAssign.filter(role => !foundRoleNames.includes(role));
          
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: `The following roles do not exist: ${missingRoles.join(', ')}`
          });
        }

        await Promise.all(roles.map(role => 
          UserRoles.create({
            id: uuidv4(),
            userId: newUser.idUser,
            roleId: role.idRole
          })
        ));
      } else {
        // Assign default 'user' role if no roles specified
        const [userRole] = await Role.findOrCreate({
          where: { name: 'user' },
          defaults: {
            idRole: uuidv4(),
            description: 'Regular user with basic access',
            isSystemRole: false
          }
        });

        await UserRoles.create({
          id: uuidv4(),
          userId: newUser.idUser,
          roleId: userRole.idRole
        });
      }



      // Fetch user with roles
      const userWithRoles = await User.findByPk(newUser.idUser, {
        include: [{
          model: Role,
          through: 'UserRoles',
          attributes: ['name']
        }]
      });

      const token = authMiddleware.generateToken(userWithRoles);

      return reply.status(201).send({
        user: {
          id: userWithRoles.idUser,
          email: userWithRoles.Email,
          roles: userWithRoles.Roles.map(role => role.name)
        },
        token
      });

    } catch (error) {
      return reply.status(500).send({ 
        statusCode: 500, 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  },

   async login(request, reply) {
    try {
      const { Email, Password } = request.body;
      console.log('Login attempt for email:', Email);
  
      // Find user with roles
      const user = await User.findOne({
        where: { Email },
        include: [{
          model: Role,
          through: 'UserRoles',
          attributes: ['idRole', 'name', 'description', 'isSystemRole']
        }],
        attributes: ['idUser', 'Email', 'Password', 'NomUser', 'PrenomUser', 'LastLogin']
      });
  
      if (!user) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }
  
      const isMatch = await bcrypt.compare(Password, user.Password); // Verify the password against the hashed password
      if (!isMatch) {
        return reply.status(401).send({ // Send unauthorized response if credentials are invalid
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }
  
      // Check if user has any roles
      if (!user.Roles || user.Roles.length === 0) {
        // Find or create user role
        const [userRole] = await Role.findOrCreate({
          where: { name: 'user' },
          defaults: {
            idRole: uuidv4(),
            description: 'Regular user with basic access',
            isSystemRole: false
          }
        });

        // Create user-role association directly
        await UserRoles.create({
          id: uuidv4(),
          userId: user.idUser,
          roleId: userRole.idRole
        });

  
        // Reload user with new role
        await user.reload({
          include: [{
            model: Role,
            through: 'UserRoles',
            attributes: ['idRole', 'name', 'description', 'isSystemRole']
          }]
        });
      }
  
      const userRoles = user.Roles.map(role => ({
        id: role.idRole,
        name: role.name,
        description: role.description,
        isSystemRole: role.isSystemRole
      }));
  
      console.log('Mapped user roles:', userRoles);
  
      const currentTime = new Date();
      await user.update({ LastLogin: currentTime });
  
      const responseData = {
        token: authMiddleware.generateToken({
          idUser: user.idUser,
          Email: user.Email,
          Roles: userRoles,
          isSuperAdmin: userRoles.some(role => role.name === 'superadmin')
        }),

        user: {
          id: user.idUser,
          email: user.Email,
          nomUser: user.NomUser,
          prenomUser: user.PrenomUser,
          isSuperAdmin: userRoles.some(role => role.name === 'superadmin'),
          lastLogin: currentTime,
          roles: userRoles

        }
      };
  
      return reply.send(responseData);
  
    } catch (error) {
      console.error('Login error:', error);
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  async updateUser(request, reply) {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      if (!validator.isUUID(id)) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Bad Request', 
          message: 'Invalid user ID' 
        });
      }

      // Find user
      const user = await User.findByPk(id);
      
      if (!user) {
        return reply.status(404).send({ 
          statusCode: 404, 
          error: 'Not Found', 
          message: 'User not found' 
        });
      }

      // If password is being updated, hash it
      if (updates.Password) {
        updates.Password = await bcrypt.hash(updates.Password, 10);
      }

      // Update user
      await user.update(updates);

      // Fetch updated user with roles
        const updatedUser = await User.findByPk(id, { // Fetch updated user details

        attributes: { exclude: ['Password'] },
        include: [{
          model: Role,
          through: 'UserRoles',
          attributes: ['name']
        }]
      });

      return reply.send({
        statusCode: 200,
        message: 'User updated successfully',
        user: updatedUser
      });

    } catch (error) {
      return reply.status(500).send({ 
        statusCode: 500, 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  },

  async deleteUser(request, reply) {
    try {
      const { id } = request.params;
      
      if (!validator.isUUID(id)) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Bad Request', 
          message: 'Invalid user ID' 
        });
      }

      // Find user with roles
      const user = await User.findByPk(id, {
        include: [{
          model: Role,
          through: 'UserRoles',
          attributes: ['name']
        }]
      });
      
      if (!user) {
        return reply.status(404).send({ 
          statusCode: 404, 
          error: 'Not Found', 
          message: 'User not found' 
        });
      }

      // Check if user is superadmin
      const isSuperAdmin = user.Roles.some(role => role.name === 'superadmin');
      if (isSuperAdmin) {
        return reply.status(403).send({ 
          statusCode: 403, 
          error: 'Forbidden', 
          message: 'SuperAdmin account cannot be deleted' 
        });
      }

      // Delete user (this will also delete associated UserRoles due to CASCADE)
      await user.destroy();

      return reply.send({
        statusCode: 200,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      return reply.status(500).send({ 
        statusCode: 500, 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  },

  async logout(request, reply) {
    try {
      reply.clearCookie('token');
      return reply.status(200).send({ 
        statusCode: 200, 
        message: 'Logged out successfully.' 
      });
    } catch (error) {
      return reply.status(500).send({ 
        statusCode: 500, 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  }
};

module.exports = userController;
