'use strict';

let dbConfig = {
  user: 'phelm',
  database: 'phelm',
  password: ' '
};
let table = 'ngram2'

let pg = require('pg');
let async = require('async');

module.exports = {
  init(initialized){
    console.log('initialisiing db');

    this.pool = new pg.Pool(dbConfig);
    this.pool.on('error', (err)=>{
      console.error('client error', err.message, err.stack);
    })

    async.waterfall([
      (cb) => {
        this.pool.connect((err, client, clientDone) => {
          cb(err, client, clientDone)
        })
      },
      (client, clientDone, cb) => {
        client.query(
          `CREATE TABLE IF NOT EXISTS ${table}(
            id SERIAL PRIMARY KEY,
            word1 TEXT,
            word2 TEXT,
            count INTEGER
          )`,
          (err) => {
            if (err && err.message.indexOf('already exists') < 0){
              console.trace('could nto create table', err);
            } else {
              err = null;
            }
            console.log(`ERR = ${err}`);
            cb(err, clientDone);
          }
        )
      }],
      (err, clientDone) => {
        clientDone();
        if (err){
          console.trace('[DB] FAILED', err);
        } else {
          console.log('[DB] INITIALISED');
        }
        initialized && initialized(err);
      }
    )
  },

  add(w1, w2, count, done){
    async.waterfall([
      (cb) => {
        this.pool.connect((err, client, clientDone)=>{
          cb(err, client, clientDone);
        })
      },
      (client, clientDone, cb) => {
        let query = `INSERT INTO ${table} (word1, word2, count) VALUES ($1,$2,$3) RETURNING id`;
        let vals = [w1, w2, count];
        client.query(query, vals, (err, res) => {
          cb(err, client, clientDone);
        })
      }],
    (err, client, clientDone) => {
      clientDone();
      if(err){
        throw new Error(err);
      }
      done(err);
    })
  },

  end(){
    this.pool.end();
  }
};
