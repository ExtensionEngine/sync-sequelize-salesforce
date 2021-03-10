'use strict';

const filter = require('lodash/filter');
const map = require('lodash/map');
const maxBy = require('lodash/maxBy');

class Loader {
  constructor(resolved) {
    this.resolved = resolved;
  }

  get rawUpdated() {
    return filter(this.resolved, { isValid: true, sfIsDeleted: false });
  }

  get updated() {
    return map(this.rawUpdated, it => ({ ...it.serialize(), deletedAt: null }));
  }

  get rawObsoleted() {
    return filter(this.resolved, it => !it.isValid || it.sfIsDeleted);
  }

  get obsoleted() {
    return map(this.rawObsoleted, 'id');
  }

  get version() {
    const { sfUpdatedAt } = maxBy(this.resolved, 'sfUpdatedAt') || {};
    return sfUpdatedAt;
  }
}

module.exports = Loader;
