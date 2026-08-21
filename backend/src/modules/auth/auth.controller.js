const authService = require('./auth.service');

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours
const isProd = process.env.NODE_ENV === 'production';

// Cross-origin deploy (frontend & backend on different Vercel domains) needs
// SameSite=None + Secure for the browser to send the cookie at all.
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
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

function me(req, res) {
  res.json({ user: { id: req.user.sub, name: req.user.name, email: req.user.email, role: req.user.role } });
}

module.exports = { login, logout, me };
