'use strict';

let config = require('./config');
let db = require('./db');

let modPos = ['ADJ', 'NOUN', 'ADV', 'VERB'];
let headPos = ['NOUN'];

let makeList = function(word) {

}

db.init(function (err) {
  err && console.error(err);
  let params = {};
  db.getWords(params, function(err, res) {
    err && console.error(err);
    res.forEach(function (row) {
      console.log(row);
    })
  })
});
