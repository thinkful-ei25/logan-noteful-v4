'use strict';

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const { JWT_SECRET, JWT_EXPIRY } = require('../config.js');

const router = express.Router();
const options = { session: false, failWithError: true };
const localAuth = passport.authenticate('local', options);

// router.post('/', localAuth, (req, res) => {
//   return res.json(req.user);
// });

router.post('/', localAuth, (req, res) => {
  const authToken = createAuthToken(req.user.toJSON());
  res.json({ authToken });
});

function createAuthToken(user) {
  return jwt.sign({ user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
}

const jwtAuth = passport.authenticate('jwt', { session: false, failWithError: true });

router.post('/refresh', jwtAuth, (req, res) => {
  const authToken = createAuthToken(req.user.toJSON());
  res.json({ authToken });
});
module.exports = router;