'use strict';

const Arbiter = require('./arbiter');
const { format } = require('util');
const invoke = require('lodash/invoke');
const Model = require('./model');
const reduce = require('lodash/reduce');
const Sqlize = require('../sqlize');
const ValidationStrategy = require('./validationStrategy');
const VersioningStrategy = require('./versioningStrategy');

const { Sequelize } = Sqlize;

const isFunction = arg => typeof arg === 'function';
const isModel = Ctor => Ctor && Ctor.prototype instanceof Arbiquelize.Model;

const { DataTypes } = Sequelize;
const { validate } = DataTypes.STRING.prototype;
DataTypes.STRING.prototype.validate = function (value, options) {
  let isValid = validate.call(this, value, options);
  if (isFunction(this.options.validate)) {
    isValid = isValid && this.options.validate.call(this, value, options);
  }
  return isValid;
};

class SalesforceId extends DataTypes.STRING {
  constructor(length = 18) {
    super(length);
    this.options.validate = function (value, options) {
      return SalesforceId.validate(this, value, options);
    };
  }

  static validate({ options }, value, _options) {
    const pattern = new RegExp(`^[a-z0-9]{${options.length}}$`, 'i');
    if (!pattern.test(value)) {
      const message = format('%j is not a valid Salesforce ID', value);
      throw new Sequelize.ValidationError(message);
    }
    return true;
  }
}
DataTypes.SALESFORCE_ID = SalesforceId;
DataTypes.SALESFORCE_ID.prototype.key = DataTypes.SALESFORCE_ID.key = 'SALESFORCE_ID';
Sequelize.SALESFORCE_ID = Sequelize.Utils.classToInvokable(DataTypes.SALESFORCE_ID);

class Arbiquelize extends Sqlize {
  constructor() {
    super(...arguments);
    this._arbiter = this._initArbiter();
    this.Sequelize = this.constructor;
  }

  _initArbiter({ salesforce, sfLogger, sfQueryLogger } = this.options) {
    const { oauth2, loginUrl, credentials } = salesforce;
    const connection = { oauth2, loginUrl };
    const config = { ...credentials, connection, sfLogger, sfQueryLogger };
    return Arbiter.configure(config);
  }

  get arbiter() {
    return this._arbiter;
  }

  define(Model) {
    // Keep backwards compatibility.
    if (!isModel(Model)) return super.define(...arguments);
    const { DataTypes, Arbiter, Promise } = this.Sequelize;
    let fields = invoke(Model, 'fields', DataTypes, Arbiter.Tags, this) || {};
    const options = invoke(Model, 'options', Arbiter.Tags) || {};
    if (options.freezeTableName !== false) options.freezeTableName = true;
    if (options.paranoid !== false) options.paranoid = true;
    if (options.timestamps !== false) options.timestamps = true;
    if (options.sf.deletable !== false) options.sf.deletable = true;
    fields = this.addDefaultFields(fields, options);
    const sfAttributes = reduce(fields, (acc, { sf }, name) => {
      if (!sf) return acc;
      sf.sf = sf.name;
      return Object.assign(acc, { [name]: sf });
    }, {});
    Model.$sfAttributes = sfAttributes;
    const schema = new Arbiter.Schema(options.sf.schemaName, sfAttributes);
    Model.$SfModel = Arbiter.model(Model.name, schema);
    this.wrapMethods(Model, Promise);
    Model.init(fields, { ...options, sequelize: this });
    return Model;
  }

  addDefaultFields(fields, options) {
    const { DataTypes } = this.Sequelize;
    const head = {};
    const tail = {};
    if (!Object.values(fields).find(it => it.primaryKey)) {
      Object.assign(head, {
        id: {
          type: DataTypes.SALESFORCE_ID,
          allowNull: false,
          primaryKey: true,
          sf: { name: 'Id' }
        }
      });
    }
    const { sf } = options;
    if (sf && sf.deletable) {
      Object.assign(tail, {
        sfIsDeleted: {
          _autoGenerated: true,
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'sf_deleted',
          sf: { name: 'IsDeleted', type: 'boolean' }
        }
      });
    }
    if (sf) {
      Object.assign(tail, {
        isValid: {
          _autoGenerated: true,
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_valid'
        }
      });
    }
    fields = Object.assign({}, head, fields, tail);
    return super.addDefaultFields(fields, options);
  }

  addTimestamps(fields, options) {
    fields = super.addTimestamps(fields, options);
    const { DataTypes } = this.Sequelize;
    const tail = {};
    Object.assign(tail, {
      sfCreatedAt: {
        _autoGenerated: true,
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: new Date(0),
        field: 'sf_created_at',
        sf: { name: 'CreatedDate', type: 'date' }
      },
      sfUpdatedAt: {
        _autoGenerated: true,
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: new Date(0),
        field: 'sf_updated_at',
        sf: { name: 'LastModifiedDate', type: 'date' }
      }
    });
    return Object.assign({}, fields, tail);
  }
}

Arbiquelize.Model = Model;
Arbiquelize.Arbiter = Arbiter;
Arbiquelize.Arbiter.Tags = require('./tags');
Arbiquelize.ValidationStrategy = ValidationStrategy;
Arbiquelize.VersioningStrategy = VersioningStrategy;

module.exports = Arbiquelize;
