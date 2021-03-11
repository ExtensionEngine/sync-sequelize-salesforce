'use strict';

const map = require('lodash/map');
const Sequelize = require('sequelize');

const { and } = Sequelize.Op;

function findViolationsDuplicates(Model, violations, index) {
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
  return Model.findAll(query);
}

module.exports = findViolationsDuplicates;
