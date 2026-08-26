const prisma = require('../config/db');

function requireModuleAccess(moduleKey) {
  const field = moduleKey === 'pricing' ? 'canAccessPricing' : 'canAccessGps';

  return async (req, res, next) => {
    if (req.user.role === 'admin') return next();
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { [field]: true },
      });
      if (!user || !user[field]) {
        return res.status(403).json({ message: 'Anda tidak memiliki akses ke modul ini' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireModuleAccess };
