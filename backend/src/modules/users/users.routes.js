const express = require('express');
const controller = require('./users.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleGuard');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', controller.listUsers);
router.post('/', controller.createUser);
router.patch('/:id', controller.updateUser);

module.exports = router;
