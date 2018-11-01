'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
// validate folder and tag id

function validateFolderId(folderId, userId) {
  // verify folderId is a valid ObjectId
  // if validation fails return error message 
  //'The folderId is not valid' with status 400
  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The folderId is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
  // verify item belongs to current user
  return Folder.find({ _id: folderId, userId })
    .then(results => {
      //console.log(results.length);
      if (results.length === 0) {
        const err = new Error('The folderId is not related to user');
        err.status = 400;
        return Promise.reject(err);
      }
    });
}

function validateTagId(tags, userId) {
  //verify tags property is an array, if fails, return
  // 'The tags property must be an array' with status 400
  if (!Array.isArray(tags)) {
    const err = new Error('The tags property must be an array');
    err.status = 400;
    return Promise.reject(err);
  }
  console.log(tags);
  //verify all tags belong to current user, if fails
  //return an error message 'The tags array contains an invalid id' with status 400.
  return Tag.find({ _id: tags, userId })
    .then(results => {
      //console.log('*******TAG RESULTS =********', results);
      let arrId = [];
      results.forEach(item => {
        let val = item._id;
        arrId.push(val);
      });
      //arrId is now the tags that are related to the user
      //console.log(arrId)
      if (arrId.length !== tags.length) {
        const err = new Error('The tags array is not related to the user');
        err.status = 400;
        return Promise.reject(err);
      }
    });
}

// routers
const router = express.Router();
// Protect endpoints using JWT Strategy
router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id;

  let filter = { userId };

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({ _id: id, userId })
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags } = req.body;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const newNote = { title, content, folderId, tags, userId };

  Promise.all([
    validateFolderId(folderId, userId),
    validateTagId(tags, userId)
  ])
    .then(() =>
      Note.create(newNote))
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const toUpdate = {};
  const updateableFields = ['title', 'content', 'userId', 'folderId', 'tags'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.folderId && !mongoose.Types.ObjectId.isValid(toUpdate.folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.tags) {
    const badIds = toUpdate.tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The `tags` array contains an invalid `id`');
      err.status = 400;
      return next(err);
    }
  }

  if (toUpdate.folderId === '') {
    delete toUpdate.folderId;
    toUpdate.$unset = { folderId: 1 };
  }
  Promise.all([
    validateFolderId(toUpdate.folderId, toUpdate.userId),
    validateTagId(toUpdate.tags, toUpdate.userId)
  ])
    .then(() =>
      Note.findByIdAndUpdate(id, toUpdate, { new: true })
        .then(result => {
          if (result) {
            res.json(result);
          } else {
            next();
          }
        })
    )
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findByIdAndRemove({ _id: id, userId })
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
