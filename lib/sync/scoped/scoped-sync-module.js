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
const uniq = require('lodash/uniq');

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
    this.pull = this._pull;
    // this.validate = memoize(this._validate, memoizeConfig);
    this.pulled = [];
    this.failed = [];
    this.processedIds = new Set();
  }

  get dependencies() {
    return transform(this.Model.associations, (acc, it) => {
      if (it.associationType !== 'BelongsTo' && !it.options.consumable) return;
      if (it.associationType === 'BelongsToMany') {
        const junction = this.Model.getJunction(it);
        return acc.push(junction);
      }
      acc.push(it);
    }, []);
  }

  async _pull(scope, entries) {
    scope.ids = scope.ids.filter(it => !this.processedIds.has(it));
    if (!scope.ids.length) return Promise.resolve();
    scope.ids.forEach(this.processedIds.add, this.processedIds);

    if (!scope.callPath) scope.callPath = [];
    scope.callPath = [...scope.callPath, this.Model.name];

    try {
      if (!entries) entries = await this.Model.fetchFromSF(scope);
      this.pulled = await this.Model.persistFromSF(entries).catch(err => this.recoverPull(err, scope));
      return this.pullDependencies(scope);
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

  async pullDependencies(scope) {
    const fkScopes = map(this.dependencies, it => {
      const targetId = it.associationType === 'BelongsTo' ? it.foreignKey : 'id';
      const identifier = it.associationType === 'BelongsTo' ? 'id' : it.foreignKey;
      return {
        syncModule: this.sync.syncModules[it.target.name],
        identifier,
        ids: uniq(compact(map(this.pulled, targetId))),
        callPath: scope.callPath,
        version: scope.version
      };
    });
    return Promise.map(fkScopes, scope => {
      if (scope.ids.length) {
        console.log(`=== ${scope.callPath.join(' -> ')} ${scope.syncModule.Model.name} ${scope.identifier}: ${scope.ids} ===`);
      }
      return scope.syncModule.pull(scope);
    });
  }
}

module.exports = ScopedSyncModule;
