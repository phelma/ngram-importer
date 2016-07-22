'use strict';

let filePath = __dirname + '/googlebooks-eng-all-2gram-20120701-ra';
let yearFrom = '1960';
let match = /horse/;

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
  out.word1 = wordSplit[0];
  out.word2 = wordSplit[1];
  out.year  = parseInt(tabSplit[1]);
  out.count = parseInt(tabSplit[2]);
  return out;
}

db.init(err => {
  let current = {};
  let added = 0;
  let rows = 0;
  let dbQueries = 0;
  let paused = false;

  let rs = fs.createReadStream(filePath).pipe(split());
  rs.on('data', (data) => {
    if (!data){
      return;
    }
    if (++ rows % 10000 === 0){
      console.log(`Done ${rows} rows`);
    }
    if (!data.match(match)){
      return;
    }
    let itemObj = getObj(data);
    if (
      itemObj.word1 === current.word1 &&
      itemObj.word2 === current.word2
    ) {
      current.count += itemObj.count;
    } else {
      if (current.word1 && current.word2 && current.count){
        if (++dbQueries >= 10 && !paused){
          paused = true;
          rs.pause();
        }

        db.add(current.word1, current.word2, current.count, (err) => {
          if (++added % 10000 === 0){
            console.log(`ADDED ${added}, ROWS ${rows}, ${current.word1}`);
          }
          err && console.error(err);
          current = itemObj;

          if (--dbQueries < 10 && paused) {
            paused = false;
            rs.resume();
          }
        });
      } else {
        current = itemObj;
      }
    }
  });

  rs.on('end', () => {
    // db.end();
  })
});


