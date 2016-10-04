/*jslint node: true */
'use strict';

const AWS = require('aws-sdk');
const app = require('express').Router();

const { guid, isValidUser } = require('app/utils/users');
const s3config = require('app/config/s3');

AWS.config.update({ region: s3config.region });
const s3 = new AWS.S3();

/*
 * GET /uploads/signedurls
 *
 * Returns a number of signed URLs from Amazon S3 that the caller can use to
 * upload media using PUT requests. Once the files are uploaded, anyone with
 * the URLs can view the files.
 *
 * The caller will need to include the URLs in the POST request for adding
 * new entries.
 *
 * If called with a query parameter "urls", the app generates and returns the
 * number of URLs specified. If the parameter is not specified, the request
 * defaults to generating 1 URL.
 *
 */
app.get('/signedurls', isValidUser, (req, res, next) => {
  const urlCount = Number(req.query.urls) || 1;
  const requests = generateRequests(urlCount);

  return Promise.all(requests)
    .then((urls) => res.json({ urls }))
    .catch(next);
});

function generateRequests(count) {
  return Array(count)
    .fill(0)
    .map(() => findValidParams().then(getSignedUrl));
}

function findValidParams() {
  const params = {
    Bucket: s3config.mediaBucket,
    Key: generateGUID()
  };

  /* s3.getObject() returns an error if an object with the generated key
   * doesn't exist, and a valid object otherwise. Hence we need to flip the
   * logic of the promise handling below.
   */
  return s3.getObject(params).promise()
    .then(findValidParams)
    .catch((err) => {
      if (err.name === 'NoSuchKey') {
        return Promise.resolve(params);
      } else {
        return Promise.reject(err);
      }
    });
}

function getSignedUrl(params) {
  params.ACL = 'public-read';
  return Promise.resolve(s3.getSignedUrl('putObject', params));
}

function generateGUID() {
  return guid();
}

module.exports = app;
