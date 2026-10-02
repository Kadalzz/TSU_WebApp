const express = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);
router.patch('/me/password', requireAuth, controller.changePassword);
router.delete('/me', requireAuth, controller.deleteAccount);

module.exports = router;
