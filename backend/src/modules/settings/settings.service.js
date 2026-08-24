const prisma = require('../../config/db');

async function listFeatureFlags() {
  return prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
}

async function setFeatureFlag(key, enabled) {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag) {
    const err = new Error('Feature flag tidak ditemukan');
    err.status = 404;
    throw err;
  }
  return prisma.featureFlag.update({ where: { key }, data: { enabled } });
}

async function isFeatureEnabledForUser(key, role) {
  if (role === 'admin') return true;
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  return flag ? flag.enabled : true;
}

module.exports = { listFeatureFlags, setFeatureFlag, isFeatureEnabledForUser };
