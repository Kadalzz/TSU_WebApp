const { isFeatureEnabledForUser } = require('../modules/settings/settings.service');

function requireFeatureEnabled(key) {
  return async (req, res, next) => {
    try {
      const enabled = await isFeatureEnabledForUser(key, req.user.role);
      if (!enabled) {
        return res.status(403).json({ message: 'Fitur ini sedang dinonaktifkan oleh Admin' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireFeatureEnabled };
