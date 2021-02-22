'use strict';

const filter = require('lodash/filter');
const map = require('lodash/map');

class ErrorManager {
  constructor(Model) {
    this.errors = [];
    this.Model = Model;
  }

  add(instance, error) {
    const entry = { id: instance.id, instance, error };
    this.errors.push(entry);
    return Promise.resolve(entry);
  }

  get({ id, error }) {
    let entries;
    if (id) entries = filter(this.errors, { id });
    else entries = filter(this.errors, it => it.error instanceof error);
    return Promise.resolve(entries);
  }

  async invalidate(query) {
    const entries = await this.get(query);
    return this.Model.update(
      { invalid: true },
      { where: { id: map(entries, 'id') } });
  }

  flush() {
    this.errors = [];
    return Promise.resolve(this.errors);
  }
}

module.exports = ErrorManager;
