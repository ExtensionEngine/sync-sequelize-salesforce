'use strict';

const every = require('lodash/every');
const filter = require('lodash/filter');
const map = require('lodash/map');

class ErrorManager {
  constructor(Model) {
    this.errors = [];
    this.Model = Model;
  }

  add(ErrorType, ...args) {
    this.errors.push(new ErrorType(...args));
    return this.errors;
  }

  findAll({ id, error, model }) {
    const matchers = [];
    if (id) matchers.push(it => it.id === id);
    if (error) matchers.push(it => it instanceof error);
    if (model) matchers.push(it => it.instance instanceof model);
    const matchAll = error => every(matchers, it => it(error));
    return filter(this.errors, matchAll);
  }

  get(id) {
    return this.findAll({ id })[0];
  }

  invalidate(query) {
    const entries = this.findAll(query);
    return this.Model.update(
      { isValid: false },
      { where: { id: map(entries, 'id') } }
    );
  }

  flush() {
    this.errors = [];
    return this.Model.update({ isValid: true }, { where: {} });
  }
}

module.exports = ErrorManager;
