'use strict';

let assert = require('assert');
let db = require('./db');

db.init((err) => {
  assert(!err);
  db.getLast((err, last) => {
    console.log(err);
    assert(!err);

    console.log(last);
    assert(last);
  })
})
