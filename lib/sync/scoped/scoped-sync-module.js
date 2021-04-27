'use strict';

const errors = require('../../errors');
const compact = require('lodash/compact');
const map = require('lodash/map');
const memoize = require('memoizee');
const objectHash = require('object-hash');
const partition = require('lodash/partition');
const Promise = require('bluebird');
const SyncModule = require('../sync-module');
const transform = require('lodash/transform');

const { SfPersistanceError, SyncModulePullError } = errors;

const memoizeConfig = {
  promise: true,
  normalizer(args) {
    return objectHash([...args], { unorderedArrays: true });
  }
};

class ScopedSyncModule extends SyncModule {
  constructor({ Model, sync }) {
    super({ Model, sync });
    this.pull = memoize(this._pull, memoizeConfig);
    this.validate = memoize(this._validate, memoizeConfig);
    this.pulled = [];
    this.failed = [];
  }

  get dependencies() {
    const getModule = it => this.sync.syncModules[it.target.name];
    return transform(this.Model.associations, (acc, it) => {
      if (it.associationType !== 'BelongsTo' && !it.options.consumable) return;
      if (it.associationType === 'BelongsToMany') {
        const junction = this.Model.getJunction(it);
        return acc.push({ ...junction, syncModule: getModule(junction) });
      }
      acc.push({ ...it, syncModule: getModule(it) });
    }, []);
  }

  async _pull(scope, entries) {
    if (!entries) entries = await this.Model.fetchFromSF(scope);
    try {
      this.pulled = await this.Model.persistFromSF(entries)
        .catch(err => this.recoverPull(err, scope));
      await this.pullDependencies();
      return Promise.resolve();
    } catch (err) {
      this.errors.pull = new SyncModulePullError(err, this);
      return Promise.reject(err);
    }
  }

  recoverPull(err, scope) {
    if (!(err instanceof SfPersistanceError)) return Promise.reject(err);
    const [invalid, valid] = partition(err.entries, err.failingField);
    this.failed.push(...invalid);
    return this._pull(scope, valid);
  }

  async pullDependencies({ version, callPath }) {
    const fks = map(this.dependencies, it => {
      const targetId = it.associationType === 'BelongsTo' ? it.foreignKey : 'id';
      const identifier = it.associationType === 'BelongsTo' ? 'id' : it.foreignKey;
      return {
        ids: compact(map(this.pulled, targetId)),
        identifier,
        syncModule: it.syncModule
      };
    });
    return Promise.map(fks, ({ syncModule, ids, identifier }) => {
      return ids.length ? syncModule.pull({ ids, identifier }) : [];
    });
  }
}

module.exports = ScopedSyncModule;
