const { User, Role, Permission, UserRoles } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const validator = require('validator');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); 

const userController = {
  
  async getCurrentUser(request, reply) {
    try {
      console.log('Requesting current user information:', request.user); // Log user information for debugging
      const user = request.user; 

      return reply.send({
        id: user.idUser,
        email: user.Email,
        nomUser: user.NomUser,
        prenomUser: user.PrenomUser,
        roles: user.Roles ? user.Roles.map(role => role.name) : [] // Check if Roles exists
      });
    } catch (error) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

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
      let usersData = request.body;
      if (!Array.isArray(usersData)) {
        usersData = [usersData];
      }

      const results = [];

      for (const userData of usersData) {
        try {
          // Validate user data
          const { error, value } = User.validate(userData);
          if (error) {
            results.push({
              success: false,
              email: userData.Email,
              error: error.details[0].message
            });
            continue;
          }

          // Check for existing user
          const existingUser = await User.findOne({
            where: { Email: value.Email }
          });

          if (existingUser) {
            results.push({
              success: false,
              email: value.Email,
              error: 'Email already in use'
            });
            continue;
          }

          // Create user
          const newUser = await User.create({
            ...value,
            idUser: uuidv4()
          });

          // Handle role assignments
          if (value.roleNames) {
            const roleNames = Array.isArray(value.roleNames) 
              ? value.roleNames 
              : [value.roleNames];

            for (const roleName of roleNames) {
              // Find or create each role
              const [role] = await Role.findOrCreate({
                where: { name: roleName },
                defaults: {
                  idRole: uuidv4(),
                  description: `${roleName} role`,
                  isSystemRole: false
                }
              });

              // Create user-role association
              await UserRoles.create({
                id: uuidv4(),
                userId: newUser.idUser,
                roleId: role.idRole
              });
            }
          }

          // Fetch the user with their roles
          const userWithRoles = await User.findByPk(newUser.idUser, {
            include: [{
              model: Role,
              through: { attributes: [] }
            }]
          });

          // Generate token
          const token = authMiddleware.generateToken(userWithRoles);

          results.push({
            success: true,
            user: {
              id: userWithRoles.idUser,
              email: userWithRoles.Email,
              nomUser: userWithRoles.NomUser,
              roles: userWithRoles.Roles.map(role => role.name)
            },
            token
          });

        } catch (userError) {
          console.error('Error creating individual user:', userError);
          results.push({
            success: false,
            email: userData.Email,
            error: userError.message
          });
        }
      }

      const hasSuccesses = results.some(r => r.success);
      const hasFailures = results.some(r => !r.success);
      
      const statusCode = hasSuccesses && hasFailures ? 207 :
                        hasSuccesses ? 201 :
                        400;

      return reply.status(statusCode).send({
        status: statusCode === 207 ? 'partial' : (statusCode === 201 ? 'success' : 'error'),
        results
      });

    } catch (error) {
      console.error('Create user error:', error);
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
  },

  refreshToken: async (request, reply) => {
    if (!request.user) {
      console.error('User information is not available in the request.');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'User information is missing'
      });
    }

    try {
      const { idUser } = request.user; // Get user ID from request.user

      console.log('Refreshing token for user ID:', idUser); // Log user ID for debugging


      // Get fresh user data with roles
      const user = await User.findOne({
        where: { idUser: idUser },

        include: [{
          model: Role,
          through: 'UserRoles',
          attributes: ['idRole', 'name', 'description', 'isSystemRole']
        }],
        attributes: ['idUser', 'Email', 'NomUser', 'PrenomUser', 'LastLogin']
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not found'
        });
      }

      const userRoles = user.Roles.map(role => ({
        id: role.idRole,
        name: role.name,
        description: role.description,
        isSystemRole: role.isSystemRole
      }));

      // Generate new token
      const token = authMiddleware.generateToken({
        idUser: user.idUser,
        Email: user.Email,
        Roles: userRoles,
        isSuperAdmin: userRoles.some(role => role.name === 'superadmin')
      });

      return reply.send({
        success: true,
        token,
        user: {
          id: user.idUser,
          email: user.Email,
          nomUser: user.NomUser,
          prenomUser: user.PrenomUser,
          lastLogin: user.LastLogin,
          isSuperAdmin: userRoles.some(role => role.name === 'superadmin'),
          roles: userRoles
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = userController;
