'use strict';

const Arbiter = require('./arbiter');
const difference = require('lodash/difference');
const errors = require('../errors');
const filter = require('lodash/filter');
const flatMap = require('lodash/flatMap');
const groupBy = require('lodash/groupBy');
const initial = require('lodash/initial');
const map = require('lodash/map');
const maxBy = require('lodash/maxBy');
const objectHash = require('object-hash');
const pick = require('lodash/pick');
const Promise = require('bluebird');
const sortBy = require('lodash/sortBy');
const Sqlize = require('../sqlize');

const isProduction = process.env.NODE_ENV === 'production';

const { DateTime } = Arbiter;
const { SfPersistanceError } = errors;

module.exports = class extends Sqlize.Model {
  static withChildren(options) {
    return this.scope({ method: ['includeChildren', options] });
  }

  static async pickSfAttrs(result) {
    const attributes = ['id', ...Object.keys(this.$sfAttributes)];
    return Array.isArray(result)
      ? result.map(it => pick(it, attributes))
      : pick(result, attributes);
  }

  static async fetchFromSF({ version, ids, identifier = 'id' } = {}) {
    const where = {
      ...(ids ? { [identifier]: ids } : {}),
      sfUpdatedAt: { $gt: DateTime(version || await this.getVersion()) }
    };
    return this.$SfModel
      .find(where)
      .sort('sfUpdatedAt')
      .select('*')
      .then(results => this.pickSfAttrs(results));
  }

  static async persistFromSF(entries) {
    try {
      const deduplicated = this.removeDuplicates(entries);
      const records = await this.bulkCreate(deduplicated, { validate: false });
      const latestRecord = maxBy(entries, 'sfUpdatedAt');
      if (latestRecord) await this.setVersion(latestRecord.sfUpdatedAt);
      return records;
    } catch (err) {
      return Promise.reject(new SfPersistanceError(err, this, entries));
    }
  }

  // TODO: deprecate this method in favor of persistFromSF
  static async pullFromSF(records) {
    records = await this.fetchFromSF();
    const upserts = await this.bulkCreate(this.removeDuplicates(records));
    const latestRecord = maxBy(records, 'sfUpdatedAt');
    if (latestRecord) await this.setVersion(latestRecord.sfUpdatedAt);
    return upserts;
  }

  static async pushToSF(payload) {
    const push = it => this.$SfModel.new(it).save()
      .then(results => this.pickSfAttrs(results));
    if (Array.isArray(payload)) {
      const sfRecords = await Promise.map(payload, push);
      return this.bulkCreate(sfRecords);
    }
    const sfRecord = await push(payload);
    return this.upsert(sfRecord, { returning: true }).then(([item]) => item);
  }

  static bulkCreate(results, options = {}) {
    const attributes = Object.keys(this.$writableAttributes);
    const defaults = {
      updateOnDuplicate: attributes,
      // NOTE: Individual model validation is turned off by default!
      validate: !isProduction
    };
    Object.assign(options, { ...defaults, ...options });
    return super.bulkCreate(results, options);
  }

  static createGrunt(data) {
    const query = new Arbiter.Query(this.$SfModel).select('*');
    const { fields, mappings } = query._fields.build();
    const [grunt] = query.createGrunts([data], fields, mappings);
    return grunt;
  }

  // If multiple instances with equal upsert key values sent
  // keeps only the last updated one among them
  static removeDuplicates(rows) {
    const upsertKeys = map(filter(this.tableAttributes, 'upsertKey'), 'fieldName');
    if (!upsertKeys.length) return rows;
    const duplicates = groupBy(rows, it => objectHash(pick(it, upsertKeys)));
    const obsolete = flatMap(duplicates, group => {
      return initial(sortBy(group, 'sfUpdatedAt'));
    });
    return difference(rows, obsolete);
  }

  validateDomain() {
    return [];
  }
};
