'use strict';

const errors = require('../errors');
const map = require('lodash/map');
const Promise = require('bluebird');
const Sequelize = require('sequelize');
const transform = require('lodash/transform');

const { and, ne } = Sequelize.Op;
const { ValidationFkError, ValidationUniquenessError } = errors;

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
      await this.hydrate();
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

  async hydrate() {
    const include = this.dependencies.associations.map(it => ({
      association: it.associationAccessor,
      attributes: [it.targetIdentifier]
    }));
    this.hydrated = await this.Model.findAll({ include });
  }

  validateDependencies() {
    return Promise.map(this.dependencies.modules, it => it.validate());
  }

  async validateAttributes() {
    const saveErrors = ({ errors }) => Promise.map(errors, it => {
      return this.syncModule.errors.add(it.instance, it);
    });
    return Promise.map(this.hydrated, it => it.validate().catch(saveErrors));
  }

  validateFks() {
    return Promise.map(this.dependencies.associations, it => this._validateFk(it));
  }

  _validateFk({ associationAccessor: alias, identifier }) {
    return Promise.map(this.hydrated, it => {
      if (!it[identifier] || it[alias]) return;
      const error = new ValidationFkError(alias, identifier, it[identifier]);
      return this.syncModule.errors.add(it, error);
    });
  }

  async validateUniqueness() {
    const validateIndex = index => this.findIndexViolations(index)
        .then(violations => this.findDuplicates(violations, index))
        .then(duplicates => this.addUniquenessErrors(duplicates, index));
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
    if (!violations.length) return [];
    const tuples = map(violations, it => `(${map(it, it => `'${it}'`)})`);
    const where = {
      [and]: [
        { sfIsDeleted: false },
        Sequelize.literal(`(${index.join()}) IN (${tuples})`)
      ]
    };
    return this.Model.findAll({ where });
  }

  addUniquenessErrors(duplicates, index) {
    Promise.map(duplicates, it => {
      const error = new ValidationUniquenessError(it, index);
      return this.syncModule.errors.add(it, error);
    });
  }
}

module.exports = SyncModuleValidation;
