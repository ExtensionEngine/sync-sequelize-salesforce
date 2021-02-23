'use strict';

const { Association } = require('sequelize');
const errors = require('../errors/validation');
const filter = require('lodash/filter');
const map = require('lodash/map');
const pick = require('lodash/pick');
const Promise = require('bluebird');
const Sequelize = require('sequelize');
const transform = require('lodash/transform');
const utils = require('../utils/validate-association');

const { and, ne } = Sequelize.Op;
const { ConsumableError, FkError, UniquenessError } = errors;
const { validateAssociation } = utils;

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

  get associations() {
    // TODO: add check for consumability
    const types = pick(Association, ['BelongsTo', 'BelongsToMany', 'HasMany']);
    return transform(types, (acc, type) => {
      acc[type] = filter(this.Model.associations, it => it instanceof type);
    }, {});
  }

  async run(entries) {
    try {
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

  hydrate(associations) {
    const include = associations.map(it => ({
      association: it.associationAccessor,
      attributes: ['id']
    }));
    return this.Model.findAll({ include });
  }

  validateDependencies() {
    return Promise.map(this.dependencies.modules, it => it.validate());
  }

  async validateAttributes() {
    const instances = await this.Model.findAll();
    const saveErrors = ({ errors }) => Promise.map(errors, it => {
      return this.syncModule.errors.add(it.instance, it);
    });
    return Promise.map(instances, it => it.validate().catch(saveErrors));
  }

  async validateFks() {
    const associations = filter(this.associations, { associationType: 'BelongsTo' });
    const instances = await this.hydrate(associations);
    return Promise.map(instances, inst => {
      return Promise.map(associations, assoc => this._validateFk(inst, assoc));
    });
  }

  _validateFk(instance, association) {
    const { associationAccessor: alias, identifier } = association;
    if (validateAssociation(instance, association)) return Promise.resolve();
    const error = new FkError(alias, identifier, instance[identifier]);
    return this.syncModule.errors.add(instance, error);
  }

  validateUniqueness() {
    return Promise.map(this.Model.uniqueIndices, async index => {
      const violations = await this.findIndexViolations(index);
      return this.invalidateDuplicates(violations, index);
    }).catch(err => { console.error('catch this properly') });
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

  async invalidateDuplicates(violations, index) {
    if (!violations.length) return [];
    const tuples = map(violations, it => `(${map(it, it => `'${it}'`)})`);
    const query = {
      where: {
        [and]: [
          { sfIsDeleted: false },
          Sequelize.literal(`(${index.join()}) IN (${tuples})`)
        ]
      }
    };
    const duplicates = await this.Model.findAll(query);
    return Promise.map(duplicates, it => {
      const error = new UniquenessError(it, index);
      return this.syncModule.errors.add(it, error);
    });
  }

  addUniquenessErrors(duplicates, index) {
    Promise.map(duplicates, it => {
      const error = new ValidationUniquenessError(it, index);
      return this.syncModule.errors.add(it, error);
    });
  }
}

module.exports = SyncModuleValidation;
