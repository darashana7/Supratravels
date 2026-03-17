const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'No token provided' });

    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try {
        req.admin = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
