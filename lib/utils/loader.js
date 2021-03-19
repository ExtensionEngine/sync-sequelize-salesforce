'use strict';

const filter = require('lodash/filter');
const map = require('lodash/map');
const maxBy = require('lodash/maxBy');
const { Op } = require('../sqlize');
const pick = require('lodash/pick');

const isUpdated = it => it.isValid && !it.sfIsDeleted;
const isObsoleted = it => !isUpdated(it);

class Loader {
  constructor(resolved, targetModel) {
    this.resolved = resolved;
    this.targetModel = targetModel;
  }

  get primaryKeys() {
    return this.targetModel ? this.targetModel.primaryKeyAttributes : ['id'];
  }

  get rawUpdated() {
    return filter(this.resolved, isUpdated);
  }

  get updated() {
    return map(this.rawUpdated, it => ({ ...it.serialize(), deletedAt: null }));
  }

  get rawObsoleted() {
    return filter(this.resolved, isObsoleted);
  }

  get obsoleted() {
    return this.primaryKeys.length > 1
      ? { [Op.or]: map(this.rawObsoleted, it => pick(it, this.primaryKeys)) }
      : { [this.primaryKeys[0]]: map(this.rawObsoleted, this.primaryKeys[0]) };
  }

  get version() {
    const { sfUpdatedAt } = maxBy(this.resolved, 'sfUpdatedAt') || {};
    return sfUpdatedAt;
  }
}

module.exports = Loader;
