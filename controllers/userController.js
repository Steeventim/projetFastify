const { User } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const validator = require('validator');

const userController = {
  async getAllUsers(request, reply) {
    try {
      const users = await User.findAll({
        attributes: { 
          exclude: ['Password'] 
        }
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
      
      // Validate UUID
      if (!validator.isUUID(id)) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Bad Request', 
          message: 'Invalid user ID' 
        });
      }

      const user = await User.findByPk(id, {
        attributes: { 
          exclude: ['Password'] 
        }
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

      // Check if email already exists
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
      
      // Generate authentication token
      const token = authMiddleware.generateToken(newUser);

      return reply.status(201).send({
        user: {
          id: newUser.idUser,
          email: newUser.Email
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

  async updateUser(request, reply) {
    try {
      const { id } = request.params;
      
      // Validate UUID
      if (!validator.isUUID(id)) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Bad Request', 
          message: 'Invalid user ID' 
        });
      }

      const { error, value } = User.validate(request.body);
      
      if (error) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Validation Error', 
          message: error.details[0].message 
        });
      }

      const [updatedRowsCount, [updatedUser]] = await User.update(value, {
        where: { idUser: id },
        returning: true
      });

      if (updatedRowsCount === 0) {
        return reply.status(404).send({ 
          statusCode: 404, 
          error: 'Not Found', 
          message: 'User not found' 
        });
      }

      return reply.send({
        user: {
          id: updatedUser.idUser,
          email: updatedUser.Email
        }
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
      
      // Validate UUID
      if (!validator.isUUID(id)) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Bad Request', 
          message: 'Invalid user ID' 
        });
      }

      const deletedRowCount = await User.destroy({
        where: { idUser: id }
      });

      if (deletedRowCount === 0) {
        return reply.status(404).send({ 
          statusCode: 404, 
          error: 'Not Found', 
          message: 'User not found' 
        });
      }

      return reply.status(204).send();
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

      // Validate input
      if (!Email || !Password) {
        return reply.status(400).send({ 
          statusCode: 400, 
          error: 'Bad Request', 
          message: 'Email and password are required' 
        });
      }

      // Find user by email
      const user = await User.findOne({ 
        where: { Email } 
      });

      if (!user) {
        return reply.status(401).send({ 
          statusCode: 401, 
          error: 'Unauthorized', 
          message: 'Invalid credentials' 
        });
      }

      // Check password
      const isMatch = await user.comparePassword(Password);
      
      if (!isMatch) {
        return reply.status(401).send({ 
          statusCode: 401, 
          error: 'Unauthorized', 
          message: 'Invalid credentials' 
        });
      }

      // Update last login
      await user.update({ LastLogin: new Date() });

      // Generate token
      const token = authMiddleware.generateToken(user);

      return reply.send({
        token,
        user: {
          id: user.idUser,
          email: user.Email
        }
      });
    } catch (error) {
      return reply.status(500).send({ 
        statusCode: 500, 
        error: 'Internal Server Error', 
        message: error.message 
      });
    }
  },

  async logout(request, reply) {
    try {
      request.session.destroy(err => {
        if (err) {
          return reply.status(500).send({ 
            statusCode: 500, 
            error: 'Internal Server Error', 
            message: 'Failed to log out.' 
          });
        }
        reply.clearCookie('connect.sid');
        return reply.status(200).send({ 
          statusCode: 200, 
          message: 'Logged out successfully.' 
        });
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
