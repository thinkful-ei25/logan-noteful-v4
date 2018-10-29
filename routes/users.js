'use strict';
const express = require('express');

const User = require('../models/user');
const router = express.Router();

//post to /api/users
router.post('/', (req, res, next) => {
  let { username, password, fullname } = req.body;

  const newUser = { username, fullname, password };
  User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return User.create(newUser);
    })
    .then(result => {
      res.location(`/api/users/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;