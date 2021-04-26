'use strict';

const errors = require('../errors');
const filter = require('lodash/filter');
const get = require('lodash/get');
const map = require('lodash/map');
const Promise = require('bluebird');
const transform = require('lodash/transform');
const utils = require('../utils');

const { AttributeError, ConsumableError, DomainError, FkError, UniquenessError } = errors;
const { findIndexViolations, findViolationsDuplicates, isBelongsToValid, isConsumableValid } = utils;

class SyncModuleValidator {
  constructor(syncModule) {
    this.syncModule = syncModule;
    this.consumables = this._getConsumables();
  }

  get Model() {
    return this.syncModule.Model;
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

  _getConsumables() {
    const matcher = it => it.options.consumable && !it.isSelfAssociation;
    const associations = filter(this.Model.associations, matcher);
    const getModule = it => this.syncModule.sync.syncModules[it.target.name];
    return new Set(associations.map(getModule));
  }

  async run(callPath) {
    try {
      await this.validateAttributes();
      await this.validateUniqueness();
      await this.validateFks();
      await this.validateConsumables(callPath);
      await this.validateDomain();
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
      attributes: ['id', 'isValid'],
      include: get(it, 'options.consumable.include', [])
    }));
    return this.Model.findAll({ include });
  }

  async overAssociations(associations, callback) {
    return Promise.map(associations, async association => {
      const instances = await this.hydrate(association);
      instances.forEach(instance => callback(instance, association));
    });
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
      if (!isBelongsToValid(instance, association)) {
        this.pushError(FkError, instance, association);
      }
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

  async validateConsumables(callPath) {
    await Promise.each(this.consumables, it => it.validate([...callPath]));
    const validateConsumable = (instance, association) => {
      if (!isConsumableValid(instance, association)) {
        this.pushError(ConsumableError, instance, association);
      }
    };
    const associations = filter(this.associations, 'options.consumable');
    return this.overAssociations(associations, validateConsumable);
  }

  async validateDomain() {
    const associations = filter(this.associations, 'options.consumable');
    const instances = await this.hydrate(associations);
    const validateDomain = instance => {
      instance.validateDomain().forEach(errorMessage => {
        this.pushError(DomainError, instance, errorMessage);
      });
    };
    return instances.forEach(validateDomain);
  }
}

module.exports = SyncModuleValidator;
