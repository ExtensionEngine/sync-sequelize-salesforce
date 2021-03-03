'use strict';

const map = require('lodash/map');
const Sequelize = require('sequelize');
const transform = require('lodash/transform');

const { and, ne } = Sequelize.Op;

function findIndexViolations(Model, index) {
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
  return Model.findAll(query);
}

module.exports = findIndexViolations;
