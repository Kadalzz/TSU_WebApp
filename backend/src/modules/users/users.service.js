const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');

async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function createUser({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email sudah terdaftar');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role === 'admin' ? 'admin' : 'user' },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  return user;
}

async function updateUser(id, { name, role, isActive }, requestingUserId) {
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
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}

module.exports = { listUsers, createUser, updateUser };
