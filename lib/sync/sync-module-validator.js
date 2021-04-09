'use strict';

const errors = require('../errors/validation');
const filter = require('lodash/filter');
const map = require('lodash/map');
const Promise = require('bluebird');
const transform = require('lodash/transform');
const utils = require('../utils');

const { AttributeError, ConsumableError, DomainError, FkError, UniquenessError } = errors;
const { findIndexViolations, findViolationsDuplicates, validateBelongsTo, validateConsumables } = utils;

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
    const types = ['BelongsTo', 'BelongsToMany', 'HasMany'];
    const getJoin = it =>
      this.Model.associations[it.as] ||
      this.Model.hasMany(it.target, it);
    return transform(this.Model.associations, (acc, it) => {
      if (types.includes(it.associationType)) acc.push(it);
      if (it.associationType === 'BelongsToMany') {
        const joinAssociation = getJoin(it.manyFromSource);
        acc.push(joinAssociation);
      }
    }, []);
  }

  async run(entries) {
    try {
      await this.validateDependencies();
      await this.validateAttributes();
      await this.validateUniqueness();
      await this.validateFks();
      await this.validateConsumables();
      return this.syncModule.errors.invalidate({ model: this.Model });
    } catch (err) {
      // TODO: throw real error here
      console.error(err);
      return Promise.reject(err);
    }
  }

  pushError(...args) {
    return this.syncModule.errors.add(...args);
  }

  hydrate(associations) {
    associations = [].concat(associations);
    const include = map(associations, it => ({
      association: it,
      attributes: ['id', 'isValid']
    }));
    return this.Model.findAll({ include });
  }

  async overAssociations(associations, callback) {
    return Promise.map(associations, async association => {
      const instances = await this.hydrate(association);
      instances.forEach(instance => callback(instance, association));
    });
  }

  validateDependencies() {
    return Promise.map(this.dependencies.modules, it => it.validate());
  }

  async validateAttributes() {
    const instances = await this.Model.findAll();
    const saveErrors = ({ errors }) => errors.forEach(it => {
      this.pushError(AttributeError, it);
    });
    return Promise.map(instances, it => it.validate().catch(saveErrors));
  }

  validateFks() {
    const associationType = 'BelongsTo';
    const associations = filter(this.associations, { associationType });
    const validateFk = (instance, association) => {
      if (validateBelongsTo(instance, association)) return;
      return this.pushError(FkError, instance, association);
    };
    return this.overAssociations(associations, validateFk);
  }

  validateUniqueness() {
    return Promise.map(this.Model.uniqueIndices, async index => {
      const violations = await findIndexViolations(this.Model, index);
      const duplicates = await findViolationsDuplicates(this.Model, violations, index);
      return Promise.map(duplicates, it => {
        return this.pushError(UniquenessError, it, index);
      });
    });
  }

  validateConsumables() {
    const associations = filter(this.associations, 'options.consumable');
    const validateConsumable = (instance, association) => {
      if (validateConsumables(instance, association)) return;
      return this.pushError(ConsumableError, instance, association);
    };
    return this.overAssociations(associations, validateConsumable);
  }

  async validateDomain() {
    const associations = filter(this.associations, 'domainValidatable');
    const instances = await this.hydrate(associations);
    const validateDomain = instance => {
      instance.getDomainErrors().forEach(errorMessage => {
        this.pushError(DomainError, instance, errorMessage);
      });
    };
    return instances.forEach(validateDomain);
  }
}

module.exports = SyncModuleValidator;
