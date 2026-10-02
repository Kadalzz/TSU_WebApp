const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const env = require('../../config/env');

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    const err = new Error('Email atau password salah');
    err.status = 401;
    throw err;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    const err = new Error('Email atau password salah');
    err.status = 401;
    throw err;
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      canAccessPricingParts: user.canAccessPricingParts,
      canAccessPricingMachine: user.canAccessPricingMachine,
      canAccessGps: user.canAccessGps,
    },
  };
}

async function changeOwnPassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    const err = new Error('Password saat ini salah');
    err.status = 401;
    throw err;
  }

  if (!newPassword || newPassword.length < 8) {
    const err = new Error('Password baru minimal 8 karakter');
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

async function deleteOwnAccount(userId, password) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    const err = new Error('Password salah');
    err.status = 401;
    throw err;
  }

  if (user.role === 'admin') {
    const otherAdmins = await prisma.user.count({ where: { role: 'admin', id: { not: userId }, isActive: true } });
    if (otherAdmins === 0) {
      const err = new Error('Tidak bisa menghapus akun ini — ini satu-satunya akun Admin yang aktif.');
      err.status = 400;
      throw err;
    }
  }

  // Search logs are just per-user analytics — safe to delete along with the account.
  await prisma.pricingSearchLog.deleteMany({ where: { userId } });

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (err) {
    if (err.code === 'P2003') {
      const e = new Error(
        'Akun ini tidak bisa dihapus karena masih tercatat sebagai pengunggah data (upload history). Hubungi admin lain untuk membantu menghapusnya.'
      );
      e.status = 400;
      throw e;
    }
    throw err;
  }
}

module.exports = { login, changeOwnPassword, deleteOwnAccount };
