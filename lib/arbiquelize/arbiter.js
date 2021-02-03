'use strict';

const Arbiter = require('arbiter/lib/arbiter');
const arbiter = require('arbiter');
const { inherits } = require('util');
const jsforce = require('jsforce');
const omit = require('lodash/omit');
const Query = require('arbiter/lib/query');
const { setLogger } = require('./logger');

const findSymbol = (obj, cb) => Object.getOwnPropertySymbols(obj).find(cb);

const { configure } = Arbiter.prototype;
Arbiter.prototype.configure = function ({ connection = {}, ...config }) {
  configure.call(this, { ...config, connection: omit(connection, 'oauth2') });
  const conn = getConnection(this.oracle);
  setLogger(conn);
  conn.oauth2 = new jsforce.OAuth2({
    ...connection.oauth2,
    loginUrl: connection.loginUrl
  });
  return this.oracle;
};

// NOTE: Support jsforce query options:
//       https://github.com/jsforce/jsforce/blob/1.9.2/lib/query.js#L18-L33
Query.prototype.options = function (options = {}) {
  options.scanAll = options.scanAll !== false;
  this._options = { ...this._options, ...options };
  return this;
};

Query.prototype.execute = function (options) {
  return this.executeQuery(options);
};

Query.prototype.exec = function (options) {
  return this.executeQuery(options);
};

// NOTE: Override _base_ `Query#executeQuery`:
//       https://npmfs.com/package/arbiter/2.0.2/lib/query/index.js#L148
Query.prototype.executeQuery = function (options) {
  this.options(options);

  const select = this._fields.build();
  const whereClauses = this._where.build();
  const modifiers = this._modifier.build();
  const sort = this._sort.build();
  const restrictions = this._restrictions.build();
  const associations = this._associations.build();

  const checks = [select, whereClauses, sort, restrictions, associations, modifiers];
  const errors = checks.filter(check => check instanceof Error);
  if (errors.length) {
    return Promise.reject(new Error(`${errors.join(', ')}`));
  }

  return this.model.sobject()
    .then(sobject => {
      const query = sobject.find(whereClauses, [...select.mappings]);
      if (this._singleReturn) {
        query.limit(1);
      }
      if (modifiers.skip) {
        query.skip(modifiers.skip);
      }
      if (modifiers.limit) {
        query.limit(modifiers.limit);
      }
      if (sort) {
        query.sort(sort);
      }
      return query.execute(this._options);
    })
    .then(queryResults => this._thrower.throwIfNeeded(queryResults))
    .then(queryResults =>
      this.createGrunts(queryResults, select.fields, select.mappings, restrictions)
    )
    .then(grunts => this._associations.fetch(grunts))
    .then(grunts => this.handleSingleReturn(grunts));
};

arbiter.Date = ISODate;
arbiter.DateTime = ISODateTime;
arbiter.Query = Query;

module.exports = arbiter;

function ISODate(date) {
  if (!(this instanceof ISODate)) return new ISODate(date);
  date = (date !== undefined) ? new Date(date) : new Date();
  const [literal] = date.toISOString().split('T');
  jsforce.Date.call(this, literal);
}
inherits(ISODate, jsforce.Date);

function ISODateTime(date) {
  if (!(this instanceof ISODateTime)) return new ISODateTime(date);
  date = (date !== undefined) ? new Date(date) : new Date();
  const literal = date.toISOString();
  jsforce.Date.call(this, literal);
}
inherits(ISODateTime, jsforce.Date);

function getConnection(oracle) {
  const $connection = findSymbol(oracle, it => {
    return oracle[it] instanceof jsforce.Connection;
  });
  return $connection && oracle[$connection];
}
