const settingsService = require('./settings.service');

async function listFeatureFlags(req, res, next) {
  try {
    res.json({ flags: await settingsService.listFeatureFlags() });
  } catch (err) {
    next(err);
  }
}

async function updateFeatureFlag(req, res, next) {
  try {
    const { key } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled wajib diisi (boolean)' });
    }
    const flag = await settingsService.setFeatureFlag(key, enabled);
    res.json({ flag });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFeatureFlags, updateFeatureFlag };
