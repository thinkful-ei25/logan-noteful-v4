'use strict';
const express = require('express');

const User = require('../models/user');
const router = express.Router();

//post to /api/users
router.post('/', (req, res, next) => {
  let { username, password, fullname } = req.body;
  // VALIDATE FIELDS, 422 = unprocessable entity
  //The username and password fields are required
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));
  if (missingField) {
    const err = new Error(`Missing '${missingField}' in req body`);
    err.status = 422;
    return next(err);
  }

  // The fields are type string
  const stringFields = ['username', 'password', 'fullname'];
  const notAString = stringFields.find(
    field => field in req.body && typeof req.body[field] !== 'string'
  );
  if (notAString) {
    const err = new Error(`'${notAString}' must be a string in req body`);
    err.status = 422;
    return next(err);
  }

  // The username and password should not have leading or trailing whitespace. 
  // And the endpoint should not automatically trim the values
  const noWhiteSpaces = ['username', 'password'];
  const notTrimmed = noWhiteSpaces.find(
    field => req.body[field].trim() !== req.body[field]
  );
  if (notTrimmed) {
    const err = new Error(`'${notTrimmed}' cannot lead or trial with whitespace`);
    err.status = 422;
    return next(err);
  }

  // The username is a minimum of 1 character
  const minUNField = ['username'];
  let minUsername = 1;
  const usernameTooShort = minUNField.find(
    field => req.body[field].trim().length < minUsername
  );
  if (usernameTooShort) {
    const err = new Error(`'${usernameTooShort}' is too short, must be at least ${minUsername} character(s) long`);
    err.status = 422;
    return next(err);
  }

  // The password is a minimum of 8 and max of 72 characters
  const passwordLengthField = ['password'];
  let minPassword = 8;
  let maxPassword = 72;
  const passwordLengthIssue = passwordLengthField.find(
    field => req.body[field].trim().length < minPassword || req.body[field].trim().length > maxPassword
  );
  if (passwordLengthIssue) {
    const err = new Error(`'${passwordLengthIssue}' is too short or long, must be between ${minPassword} and ${maxPassword} characters long`);
    err.status = 422;
    return next(err);
  }

  //Hash password and send to response
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