import { getUserFromToken } from '../database/connection.js';

/**
 * Authentication middleware to verify JWT tokens and extract user info
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const user = await getUserFromToken(token);
      
      if (!user) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token is invalid or expired'
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (tokenError) {
      console.error('Token validation failed:', tokenError);
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Could not verify token'
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
}

/**
 * Optional authentication - sets user if token is valid, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const user = await getUserFromToken(token);
        req.user = user;
      } catch (error) {
        // Silently fail for optional auth
        console.log('Optional auth failed:', error.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without user
  }
}

/**
 * Check user permissions based on mirror depth and privacy settings
 */
export function checkPermissions(requiredLevel = 1) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated for this operation'
        });
      }

      // For now, all authenticated users have basic permissions
      // Future implementation could check mirror_depth and privacy_preferences
      const userMirrorDepth = req.user.user_metadata?.mirror_depth || 3;
      
      if (userMirrorDepth >= requiredLevel) {
        next();
      } else {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This operation requires mirror depth level ${requiredLevel} or higher`
        });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        message: 'Could not verify permissions'
      });
    }
  };
}

/**
 * Rate limiting based on user tier and operation type
 */
export function rateLimitByOperation(operation) {
  // Return a function that can be used as middleware
  return (req, res, next) => {
    // For now, just log the operation
    // Future implementation could implement sophisticated rate limiting
    console.log(`Rate limit check for operation: ${operation}, user: ${req.user?.id}`);
    next();
  };
}
