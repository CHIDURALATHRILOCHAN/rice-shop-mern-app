const jwt = require('jsonwebtoken');

// This middleware now accepts an array of roles that are allowed to access the route
module.exports = function (roles = []) {
    // roles can be a single string or an array of strings, ensure it's an array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        // Get token from header
        const token = req.header('x-auth-token');

        // Check if no token
        if (!token) {
            return res.status(401).json({ msg: 'No token, authorization denied' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.user; // User payload: { id, username, role }

            // Check for role-based authorization
            if (roles.length > 0 && !roles.includes(req.user.role)) {
                return res.status(403).json({ msg: 'Forbidden: You do not have the required role to access this resource.' }); // 403 Forbidden
            }

            next(); // Move to the next middleware/route handler
        } catch (err) {
            res.status(401).json({ msg: 'Token is not valid' });
        }
    };
};