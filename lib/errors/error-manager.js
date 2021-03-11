'use strict';

const every = require('lodash/every');
const filter = require('lodash/filter');
const map = require('lodash/map');

class ErrorManager {
  constructor(Model) {
    this.errors = [];
    this.Model = Model;
  }

  add(error) {
    this.errors.push(error);
    return this.errors;
  }

  findAll({ id, error, model }) {
    const matches = [];
    if (id) matches.push(it => it.id === id);
    if (error) matches.push(it => it instanceof error);
    if (model) matches.push(it => it.instance instanceof model);
    const matchAll = error => every(matches, it => it(error));
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
    return this.errors;
  }
}

module.exports = ErrorManager;
