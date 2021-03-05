'use strict';

const filter = require('lodash/filter');
const map = require('lodash/map');
const maxBy = require('lodash/maxBy');

class SyncModuleLoader {
  constructor(syncModule) {
    this.syncModule = syncModule;
  }

  get Model() {
    return this.syncModule.Model;
  }

  get updated() {
    return filter(this.resolved, { isValid: true, sfIsDeleted: false });
  }

  get importableUpdated() {
    return map(this.updated, it => ({ ...it.serialize(), deletedAt: null }));
  }

  get obsoleted() {
    return filter(this.resolved, it => !it.isValid || it.sfIsDeleted);
  }

  get importableObsoleted() {
    return map(this.obsoleted, 'id');
  }

  get version() {
    const { sfUpdatedAt } = maxBy(this.resolved, 'sfUpdatedAt') || {};
    return sfUpdatedAt;
  }

  load() {
    try {
      this.resolved = this.Model.resolveAll();
    } catch (err) {
      // TODO: throw real error here
      console.error(err);
      throw err;
    }
  }
}

module.exports = SyncModuleLoader;
