'use strict';

let config = require('./config');
let filePath = config.filePath;
let yearFrom = config.yearFrom;
let match = new RegExp(config.match, 'i');

let posreg = new RegExp(config.posreg);

let fs = require('fs');
let async = require('async');
let split = require('split');
let byline = require('byline');

let db = require('./db');

let getObj = (line) => {
  // WORD1 \x20 WORD2 \t YEAR \t COUNT \t CHAPTERS
  let out = {};
  let tabSplit = line.split('\t');
  let wordSplit = tabSplit[0].split('\x20');

  let word1 = wordSplit[0];
  let word1match = word1.match(posreg)
  if (word1match){
    out.word1 = word1.slice(0, word1match.index);
    out.word1pos = word1match[1];
  } else {
    out.word1 = word1;
    // out.word1pos = null;
  }

  let word2 = wordSplit[1];
  let word2match = word2.match(posreg)
  if (word2match){
    out.word2 = word2.slice(0, word2match.index);
    out.word2pos = word2match[1];
  } else {
    out.word2 = word2;
    // out.word2pos = null;
  }

  out.ngramString = tabSplit[0];
  out.year  = parseInt(tabSplit[1]);
  out.count = parseInt(tabSplit[2]);
  return out;
}

db.init(err => {
  let previous = {};
  let added = 0;
  let rows = 0;
  let dbQueries = 0;
  let paused = false;

  let rs = fs.createReadStream(filePath).pipe(split());
  rs.on('data', (data) => {
    if (!data){
      return;
    }
    if (++ rows % 10000000 === 0){
      console.log(`Done ${rows} rows`);
    }
    let itemObj = getObj(data);
    if (itemObj.year < yearFrom){ // before cutoff year
      return;
    }
    if ( // WORDS ARE THE SAME
      itemObj.ngramString === previous.ngramString
    ) {
      previous.count += itemObj.count;
    } else {
      if (previous.ngramString){ // WORDS NOT EMPTY
        if (++dbQueries >= config.dbPool && !paused){ // max 10 concurrent
          paused = true;
          rs.pause();
        }

        db.add(previous, (err) => {
          if (++added % config.logInsertEvery === 0){
            console.log(`ADDED ${added}, ROWS ${rows}, ${previous.word1}`);
          }
          err && console.error(err);

          if (--dbQueries < config.dbPool && paused) {
            paused = false;
            rs.resume();
          }
        });
      }
      previous = itemObj;
    }
  });

  rs.on('end', () => {
    // db.end();
  })
});


