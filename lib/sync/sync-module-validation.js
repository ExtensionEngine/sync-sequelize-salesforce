'use strict';

const errors = require('../errors');
const find = require('lodash/find');
const map = require('lodash/map');
const Promise = require('bluebird');

class SyncModuleValidation {
  constructor(syncModule) {
    this.syncModule = syncModule;
  }

  get Model() {
    return this.syncModule.Model;
  }

  get dependencies() {
    return this.syncModule.dependencies;
  }

  async run(entries) {
    try {
      await this.validateDependencies();
      await this.hydrate();
      return this.validateFks();
    } catch (err) {
      // TODO: throw real error here
      console.error(err);
      throw err;
    }
  }

  validateDependencies() {
    return Promise.map(this.dependencies.modules, it => it.validate());
  }

  async hydrate() {
    const where = { id: map(this.syncModule.pulled, 'id') };
    const include = this.dependencies.associations.map(it => ({
      association: it.associationAccessor,
      attributes: [it.targetIdentifier]
    }));
    this.hydrated = await this.Model.findAll({ include, where });
  }

  async validateFks() {
    this.dependencies.associations.forEach(it => this._validateFk(it), this);
    const invalids = this.syncModule.pulled.filter(it => it.errors);
    return invalids;
  }

  _validateFk({ associationAccessor, identifier }) {
    const getPulled = it => find(this.syncModule.pulled, { id: it.id });
    return this.hydrated.forEach(it => {
      const pulled = getPulled(it);
      if (!it[identifier] || it[associationAccessor]) return;
      pulled.errors = pulled.errors || [];
      // TODO: throw real error here
      pulled.errors.push(new Error(`whoa there ${it.id}, missing ${identifier} ${it[identifier]}`));
    });
  }
}

module.exports = SyncModuleValidation;
