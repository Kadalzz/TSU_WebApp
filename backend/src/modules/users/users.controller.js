const usersService = require('./users.service');

async function listUsers(req, res, next) {
  try {
    res.json({ users: await usersService.listUsers() });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role, canAccessPricing, canAccessGps } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, dan password wajib diisi' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password minimal 8 karakter' });
    }
    const user = await usersService.createUser({ name, email, password, role, canAccessPricing, canAccessGps });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { name, role, isActive, canAccessPricing, canAccessGps } = req.body;
    const user = await usersService.updateUser(
      id,
      { name, role, isActive, canAccessPricing, canAccessGps },
      req.user.sub
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser };
