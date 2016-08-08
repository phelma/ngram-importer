'use strict';

let config = require('./config');

let dbConfig = config.db;

let table = config.db.table;

let assert = require('assert');
let pg;
if (config.native){
  pg = require('pg').native;
} else {
  pg = require('pg');
}
let async = require('async');
let knex = require('knex')({client: 'pg'});

let capitalizeFirstLetter = (string) => {
 return string.charAt(0).toUpperCase() + string.slice(1);
}

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
            word1pos TEXT,
            word2 TEXT,
            word2pos TEXT,
            count BIGINT
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
        if (err){
          console.trace('[DB] FAILED', err);
        } else {
          console.log('[DB] INITIALISED');
        }
        clientDone();
        initialized && initialized(err);
      }
    )
  },

  add(ngram, done){
    async.waterfall([
      (cb) => {
        this.pool.connect((err, client, clientDone)=>{
          cb(err, client, clientDone);
        })
      },
      (client, clientDone, cb) => {
        let query = `INSERT INTO ${table} (word1, word1pos, word2, word2pos, count) VALUES ($1,$2,$3, $4, $5) RETURNING id`;
        let vals = [ngram.word1, ngram.word1pos, ngram.word2, ngram.word2pos, ngram.count];
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
  },

  getLast(done){
    async.waterfall([
      (cb) => {
        this.pool.connect((err, client, clientDone) => {
          cb(err, client, clientDone);
        });
      },
      (client, clientDone, cb) => {
        let query = `SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`;
        let vals = [];
        client.query(query, vals, (err, res) => {
          cb(err, res, clientDone);
        })
      }],
      (err, res, clientDone) => {
        clientDone();
        if(err){
          throw new Error(err);
        }
        let out = res.rows[0];
        done(err, out);
      }
    )
  },

  getWords(params, done){
    // params = {head, first, headPos, modPos, count}
    let head = params.head.trim().toLowerCase();
    if (head.split(' ').length > 1){
      console.warn('skipping, more than 1 word');
      done([]);
      return;
    }

    let headCap = capitalizeFirstLetter(head);

    let query = knex
      .select(['word1', 'word1pos', 'word2', 'word2pos', 'count'])
      .from(table)
      .whereNotNull('word1')
      .whereNotNull('word2')
      .whereNot({
        word1: '',
        word2: ''
      })
    if (!params.first){
      query = query.whereIn('word2', [head, headCap])
      // .whereIn('word2pos', params.headPos)
      .whereIn('word1pos', params.modPos)
    } else {
      query = query.whereIn('word1', [head, headCap])
      // .whereIn('word1pos', params.headPos)
      .whereIn('word2pos', params.modPos)
    }

    query = query.orderBy('count', 'desc')
      .limit(params.count)
      .toString();

    async.waterfall([
      (cb) => {
        this.pool.connect((err, client, clientDone) => {
          cb(err, client, clientDone);
        })
      },

      (client, clientDone, cb) => {
        client.query(
          query,
          (err, res) => {
            cb(err, res, clientDone);
          })
      }

    ], (err, res, clientDone) => {
      clientDone();
      err && console.error(err);
      done(err, res.rows);
    })
  }
};
