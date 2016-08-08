'use strict';
let count = 100;
let inputFile = `${__dirname}/vocab.csv`;
let outputFile = `${__dirname}/out-${Date.now()}.csv`;

let config = require('./config');
let db = require('./db');

let fs = require('fs');
let split = require('split');
let async = require('async');
let parse = require('csv-parse');
let stringify = require('csv-stringify');
let parser = parse();

let modPos = ['ADJ', 'NOUN', 'ADV', 'VERB'];
// let headPos = ['NOUN'];

let makeList = function(word, cb) {
  let pairs = [];

  async.each([false], function(first, cb) {
    let params = {
      head: word,
      first: first,
      // headPos: headPos,
      modPos: modPos,
      count: count
    };

    db.getWords(params, function(err, res) {
      pairs = pairs.concat(res);
      cb(err);
    });
  }, function(err) {
    err && console.error(err);
    if (pairs.length < 1 || pairs[0] === undefined){
      cb(err, pairs);
      return;
    }
    // make words lowercase
    pairs.forEach(function (pair) {
      pair.word1 = pair.word1.toLowerCase();
      pair.word2 = pair.word2.toLowerCase();
    });

    // remove duplicates
    pairs = pairs.filter(function(pair, pos) {
      let index = pairs.findIndex(function(testPair) {
        return pair.word1 + pair.word2 === testPair.word1 + testPair.word2;
      })
      return index === pos;
    })

    // sort decending
    pairs.sort((a,b) => {
      return parseInt(b.count) - parseInt(a.count);
    });

    // cut list down
    pairs = pairs.slice(0, count);

    // format
    pairs = pairs.map(pair => {
      let out = `${pair.word1.toLowerCase()} ${pair.word2.toLowerCase()}`;
      return out;
    })

    cb(err, pairs);
  })
}



console.time('took');
db.init(function (err) {
  let paused = false;
  let dbQueries = 0;

  let rs = fs.createReadStream(inputFile)
    .pipe(parser)

  let ws = fs.createWriteStream(outputFile);
  rs.on('data', (data) => {
    if (!data){
      return;
    }

    if (++dbQueries >= config.dbPool && !paused){ // max 10 concurrent
      paused = true;
      rs.pause();
    }

    makeList(data[0], (err, pairs) => {
      console.timeEnd('took');
      if (--dbQueries < config.dbPool && paused) {
        paused = false;
        rs.resume();
      }
      pairs.push('');
      let string = pairs.join('\n');
      fs.appendFile(outputFile, string);
    });
  });

  rs.on('end', () => {
    console.log('DONE');
  })
  // makeList('beach', (err, pairs) => {
  //   console.log(pairs);
  //   console.timeEnd('took');
  //   db.end();
  // });
});
