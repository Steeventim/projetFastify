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
      
      // Fetch user with roles and permissions
      const user = await User.findOne({
        where: { idUser: decoded.id },
        include: [{
          model: Role,
          through: { attributes: [] }, // Exclude junction table attributes
          attributes: ['name', 'description', 'isSystemRole'],
          include: [{
            model: Permission,
            as: 'permissions', // <-- Fix: use the alias defined in Role model
            through: { attributes: [] },
            attributes: ['LibellePerm']
          }]
        }]
      });

      if (!user) {
        return reply.status(401).send({ 
          statusCode: 401, 
          error: 'Unauthorized', 
          message: 'Invalid token' 
        });
      }

      // Aggregate permissions from roles (Sequelize alias is `permissions`)
      const permissionsSet = new Set();
      if (Array.isArray(user.Roles)) {
        user.Roles.forEach(role => {
          // support both alias shapes: role.permissions (defined) or legacy role.Permissions
          const rolePerms = role.permissions || role.Permissions || [];
          if (Array.isArray(rolePerms)) {
            rolePerms.forEach(perm => {
              if (perm && perm.LibellePerm) permissionsSet.add(perm.LibellePerm);
            });
          }
        });
      }
      const permissions = Array.from(permissionsSet);

      // Check if user is superadmin or admin
      const isSuperAdmin = (user.Roles || []).some(role => role.name === 'superadmin');
      const isAdmin = (user.Roles || []).some(role => role.name === 'admin');

      // Normalize and attach user info to request (keep minimal role shape)
      request.user = {
        idUser: user.idUser, // Make sure we use the correct property name
        id: user.idUser,     // Add this for compatibility
        Email: user.Email,
        NomUser: user.NomUser,
        PrenomUser: user.PrenomUser,
        isSuperAdmin,
        isAdmin,
        roles: (user.Roles || []).map(r => ({
          name: r.name,
          description: r.description,
          isSystemRole: r.isSystemRole
        })),
        permissions
      };

      // Debug logging
      console.log('Token decoded:', decoded);
      console.log('User ID from token:', decoded.id);
      console.log('User ID in request:', request.user.idUser);
      console.log('User permissions:', permissions);

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
  generateToken: async (user) => {
    const isSuperAdmin = (user.Roles || []).some(role => role.name === 'superadmin');
    const isAdmin = (user.Roles || []).some(role => role.name === 'admin');

    // Prefer explicit user.permissions if provided (controller passes it), otherwise aggregate from roles
    let permissions = [];
    if (Array.isArray(user.permissions) && user.permissions.length) {
      permissions = [...new Set(user.permissions)];
    } else if (Array.isArray(user.Roles) && user.Roles.length) {
      // First try to collect from provided role objects
      user.Roles.forEach(role => {
        const rolePerms = role.permissions || role.Permissions || [];
        if (Array.isArray(rolePerms) && rolePerms.length) {
          permissions.push(...rolePerms.map(p => p.LibellePerm).filter(Boolean));
        }
      });

      // If still empty, fetch roles from DB (by id or name) to load permissions
      if (permissions.length === 0) {
        const roleIds = user.Roles.map(r => r.id || r.idRole).filter(Boolean);
        const roleNames = user.Roles.map(r => r.name).filter(Boolean);
        let rolesFromDb = [];
        try {
          if (roleIds.length) {
            rolesFromDb = await Role.findAll({
              where: { idRole: roleIds },
              include: [{ model: Permission, as: 'permissions', through: { attributes: [] }, attributes: ['LibellePerm'] }]
            });
          } else if (roleNames.length) {
            rolesFromDb = await Role.findAll({
              where: { name: roleNames },
              include: [{ model: Permission, as: 'permissions', through: { attributes: [] }, attributes: ['LibellePerm'] }]
            });
          }

          rolesFromDb.forEach(r => {
            if (Array.isArray(r.permissions)) {
              permissions.push(...r.permissions.map(p => p.LibellePerm).filter(Boolean));
            }
          });
        } catch (err) {
          // Log but don't fail token generation because of this
          console.error('Error fetching role permissions for token generation:', err.message || err);
        }
      }

      permissions = [...new Set(permissions)]; // Remove duplicates
    }

    return jwt.sign(
      {
        id: user.idUser, // Make sure we use the correct property name
        idUser: user.idUser, // Add this for compatibility
        email: user.Email,
        roles: (user.Roles || []).map(role => ({
          name: role.name,
          description: role.description,
          isSystemRole: role.isSystemRole
        })),
        permissions,
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
