const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');

const authMiddleware = {
  // Verify JWT Token
  verifyToken: async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.status(401).send({ 
          statusCode: 401, 
          error: 'Unauthorized', 
          message: 'No token provided' 
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        // Special handling for refresh token endpoint
        if (request.url === '/refresh-token' && error.name === 'TokenExpiredError') {
          decoded = jwt.decode(token);
        } else {
          throw error;
        }
      }
      
      // Fetch user with roles
      const user = await User.findOne({
        where: { idUser: decoded.id },
        include: [{
          model: Role,
          through: { attributes: [] }, // Exclude junction table attributes
          attributes: ['name', 'description', 'isSystemRole']
        }]
      });

      if (!user) {
        return reply.status(401).send({ 
          statusCode: 401, 
          error: 'Unauthorized', 
          message: 'Invalid token' 
        });
      }

      // Check if user is superadmin or admin
      const isSuperAdmin = user.Roles?.some(role => role.name === 'superadmin');
      const isAdmin = user.Roles?.some(role => role.name === 'admin');

      // Attach user info to request
      request.user = {
        idUser: user.idUser, // Make sure we use the correct property name
        id: user.idUser,     // Add this for compatibility
        Email: user.Email,
        NomUser: user.NomUser,
        PrenomUser: user.PrenomUser,
        isSuperAdmin,
        isAdmin,
        roles: user.Roles || []
      };

      // Debug logging
      console.log('Token decoded:', decoded);
      console.log('User ID from token:', decoded.id);
      console.log('User ID in request:', request.user.idUser);

    } catch (error) {
      console.error('Token verification error:', error);
      if (error.name === 'TokenExpiredError') {
        return reply.status(401).send({ 
          statusCode: 401, 
          error: 'Unauthorized', 
          message: 'Token expired' 
        });
      }
      return reply.status(403).send({ 
        statusCode: 403, 
        error: 'Forbidden', 
        message: 'Invalid token' 
      });
    }
  },

  requireSuperAdmin: async (request, reply) => {
    if (!request.user?.isSuperAdmin) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Super Administrator access required'
      });
    }
  },

  // Role-Based Access Control
  requireRole: (allowedRoles) => {
    return async (request, reply) => {
      try {
        await authMiddleware.verifyToken(request, reply);
        
        const userRoles = request.user.roles || [];
        console.log('User roles:', userRoles);
        console.log('Allowed roles:', allowedRoles);
        
        // New permission logic:
        const hasPermission = userRoles.some(userRole => {
          // Allow if admin or superadmin
          if (userRole.name === 'admin' || userRole.name === 'superadmin') {
            return true;
          }
          
          // Allow if role matches and either:
          // 1. Role is in allowed roles regardless of isSystemRole
          // 2. Role has isSystemRole: false
          if (allowedRoles.includes(userRole.name)) {
            return true;
          }

          // Always allow non-system roles that match allowed roles
          if (!userRole.isSystemRole && allowedRoles.includes('user')) {
            return true;
          }

          return false;
        });
        
        console.log('Has permission:', hasPermission);
  
        if (!hasPermission) {
          return reply.status(403).send({ 
            statusCode: 403, 
            error: 'Forbidden', 
            message: 'Insufficient role permissions' 
          });
        }
      } catch (error) {
        console.error('Role verification error:', error);
        return reply.status(500).send({ 
          statusCode: 500, 
          error: 'Internal Server Error', 
          message: error.message 
        });
      }
    };
  },

  // Permission-Based Access Control
  requirePermission: (requiredPermissions) => {
    return async (request, reply) => {
      try {
        await authMiddleware.verifyToken(request, reply);
        
        // Allow access if user is admin or superadmin
        if (request.user.isAdmin || request.user.isSuperAdmin) {
          return;
        }

        const userPermissions = request.user.permissions || [];
        const hasPermission = requiredPermissions.some(perm => 
          userPermissions.includes(perm)
        );

        if (!hasPermission) {
          return reply.status(403).send({ 
            statusCode: 403, 
            error: 'Forbidden', 
            message: 'Insufficient specific permissions' 
          });
        }
      } catch (error) {
        console.error('Permission verification error:', error);
        return reply.status(500).send({ 
          statusCode: 500, 
          error: 'Internal Server Error', 
          message: error.message 
        });
      }
    };
  },

  // Generate JWT Token
  generateToken: (user) => {
    const isSuperAdmin = user.Roles?.some(role => role.name === 'superadmin');
    const isAdmin = user.Roles?.some(role => role.name === 'admin');
    
    return jwt.sign(
      { 
        id: user.idUser,      // Make sure we use the correct property name
        idUser: user.idUser,  // Add this for compatibility
        email: user.Email,
        roles: user.Roles?.map(role => ({
          name: role.name,
          description: role.description,
          isSystemRole: role.isSystemRole
        })) || [],
        isSuperAdmin,
        isAdmin
      }, 
      process.env.JWT_SECRET, 
      { 
        expiresIn: process.env.JWT_EXPIRATION || '1h' 
      }
    );
  }
};

module.exports = authMiddleware;