'use strict';

const errors = require('../errors/validation');
const filter = require('lodash/filter');
const map = require('lodash/map');
const Promise = require('bluebird');
const transform = require('lodash/transform');
const utils = require('../utils');

const { ConsumableError, FkError, UniquenessError } = errors;
const { findIndexViolations, findViolationsDuplicates, validateAssociation } = utils;

class SyncModuleValidator {
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
    const types = ['BelongsTo', 'BelongsToMany', 'HasMany'];
    const addJunction = it => this.Model.associations[it.as] ||
      this.Model.hasMany(it.target, it);
    return transform(this.Model.associations, (acc, it) => {
      if (types.includes(it.associationType)) acc.push(it);
      if (it.associationType === 'BelongsToMany') acc.push(addJunction(it.manyFromSource));
    }, []);
  }

  async run(entries) {
    try {
      this.instances = await this.hydrate();
      await this.validateAttributes();
      await this.validateUniqueness();
      this.validateFks();
      await this.validateDependencies();
      this.validateConsumables();
      this.validateDomain();
      return this.syncModule.errors.invalidate({ model: this.Model });
    } catch (err) {
      // TODO: throw real error here
      console.error(err);
      throw err;
    }
  }

  hydrate(associations = this.associations) {
    const include = map(associations, it => ({
      association: it,
      attributes: ['id', 'isValid']
    }));
    return this.Model.findAll({ include });
  }

  validateDependencies() {
    return Promise.map(this.dependencies.modules, it => it.validate());
  }

  async validateAttributes() {
    const instances = await this.Model.findAll();
    const saveErrors = ({ errors }) => Promise.map(errors, error => {
      return this.syncModule.errors.add(error);
    });
    return Promise.map(instances, it => it.validate().catch(saveErrors));
  }

  validateFks() {
    const associationType = 'BelongsTo';
    const associations = filter(this.associations, { associationType });
    return this.instances.forEach(inst =>
      associations.forEach(assoc => {
        if (validateAssociation(inst, assoc)) return;
        const error = new FkError(inst, assoc);
        return this.syncModule.errors.add(error);
      })
    );
  }

  validateUniqueness() {
    return Promise.map(this.Model.uniqueIndices, async index => {
      const violations = await findIndexViolations(this.Model, index);
      const duplicates = await findViolationsDuplicates(this.Model, violations, index);
      return Promise.map(duplicates, it => {
        const error = new UniquenessError(it, index);
        return this.syncModule.errors.add(error);
      });
    });
  }

  validateConsumables() {
    const validateInstance = it => this.associations.forEach(assoc => {
      if (validateAssociation(it, assoc)) return;
      const error = new ConsumableError(it, assoc);
      return this.syncModule.errors.add(error);
    });
    return this.instances.forEach(validateInstance);
  }

  validateDomain() {
    this.instances.forEach(it => {
      const errors = it.validateDomain();
      errors.forEach(it => this.syncModule.errors.add(it));
    });
  }
}

module.exports = SyncModuleValidator;
