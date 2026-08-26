const authService = require('./auth.service');
const prisma = require('../../config/db');

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours
const isProd = process.env.NODE_ENV === 'production';

// Requests always go through the frontend's own-origin rewrite proxy
// (see frontend/next.config.js), so the cookie stays strictly first-party —
// plain Lax is correct and safest here, no cross-site SameSite=None needed.
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
};

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi' });
    }

    const { token, user } = await authService.login(email, password);

    res.cookie('token', token, { ...cookieOptions, maxAge: COOKIE_MAX_AGE_MS });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out' });
}

async function me(req, res, next) {
  try {
    // Fresh DB lookup (not just JWT claims) so role/module-access changes an
    // Admin makes take effect immediately, without waiting for re-login.
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        canAccessPricing: user.canAccessPricing,
        canAccessGps: user.canAccessGps,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me };
