'use strict';

const find = require('lodash/find');
const map = require('lodash/map');
const Promise = require('bluebird');
const Sequelize = require('sequelize');
const transform = require('lodash/transform');

const { and, ne } = Sequelize.Op;

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

  get hydrated() {
    return this.syncModule.hydrated;
  }

  async run(entries) {
    try {
      if (this.Model.name !== 'course_enrollment') return;
      await this.validateDependencies();
      await this.validateAttributes();
      await this.validateFks();
      return this.validateUniqueness();
    } catch (err) {
      // TODO: throw real error here
      console.error(err);
      throw err;
    }
  }

  validateDependencies() {
    return Promise.map(this.dependencies.modules, it => it.validate());
  }

  async validateAttributes() {
    return Promise.map(this.hydrated, it => it.validate());
  }

  async validateFks() {
    this.dependencies.associations.forEach(it => this._validateFk(it), this);
    const invalids = this.syncModule.pulled.filter(it => it.errors);
    return invalids;
  }

  _validateFk({ associationAccessor: alias, identifier }) {
    return this.hydrated.forEach(it => {
      if (!it[identifier] || it[alias]) return;
    });
  }

  async validateUniqueness() {
    const validateIndex = index => this.findIndexViolations(index)
        .then(it => this.findDuplicates(it, index))
        .then(it => this.addUniqenessError(it));
    return Promise.map(this.Model.uniqueIndices, validateIndex)
      .catch(err => { console.error('catch this properly') });
  }

  findIndexViolations(index) {
    const query = {
      attributes: index,
      where: {
        [and]: {
          sfIsDeleted: false,
          ...transform(index, (acc, it) => (acc[it] = { [ne]: null }), {})
        }
      },
      group: map(index, Sequelize.col),
      having: Sequelize.literal('COUNT(*) > 1'),
      raw: true
    };
    return this.Model.findAll(query);
  }

  findDuplicates(violations, index) {
    const tuples = map(violations, it => `(${map(it, it => `'${it}'`)})`);
    const where = {
      [and]: [
        { sfIsDeleted: false },
        Sequelize.literal(`(${index.join()}) IN (${tuples})`)
      ]
    };
    return this.Model.findAll({ where });
  }

  addUniquenessError() {
    return Promise.resolve();
  }
}

module.exports = SyncModuleValidation;
