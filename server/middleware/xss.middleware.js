const xss = require('xss');

const sanitize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  // Create a deep copy to avoid mutating the original object (e.g., Mongoose documents)
  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = xss(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }
  return sanitized;
};

const xssMiddleware = (req, _, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
};

module.exports = xssMiddleware;
