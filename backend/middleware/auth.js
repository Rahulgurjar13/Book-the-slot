const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded.id); // Debug log with just id for privacy
    req.user = decoded; // { id, isAdmin }
    next();
  } catch (error) {
    console.error('Token verification error:', error.name); // Debug log
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired', expired: true });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    res.status(401).json({ message: 'Authentication error' });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, (err) => {
    if (err) return next(err);
    
    if (!req.user || !req.user.isAdmin) {
      console.log(`User ${req.user?.id || 'unknown'} denied admin access`); // Debug log
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

module.exports = { auth, adminAuth };