const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  canAccessPricing: true,
  canAccessGps: true,
  createdAt: true,
};

async function listUsers() {
  return prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

async function createUser({ name, email, password, role, canAccessPricing, canAccessGps }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email sudah terdaftar');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role === 'admin' ? 'admin' : 'user',
      canAccessPricing: canAccessPricing !== undefined ? canAccessPricing : true,
      canAccessGps: canAccessGps !== undefined ? canAccessGps : true,
    },
    select: USER_SELECT,
  });
  return user;
}

async function updateUser(id, { name, role, isActive, canAccessPricing, canAccessGps }, requestingUserId) {
  if (id === requestingUserId && isActive === false) {
    const err = new Error('Tidak bisa menonaktifkan akun sendiri');
    err.status = 400;
    throw err;
  }
  if (id === requestingUserId && role && role !== 'admin') {
    const err = new Error('Tidak bisa menurunkan role akun sendiri');
    err.status = 400;
    throw err;
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(canAccessPricing !== undefined ? { canAccessPricing } : {}),
      ...(canAccessGps !== undefined ? { canAccessGps } : {}),
    },
    select: USER_SELECT,
  });
}

module.exports = { listUsers, createUser, updateUser };
