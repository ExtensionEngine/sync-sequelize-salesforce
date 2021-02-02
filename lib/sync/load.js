'use strict';

function load() {
  console.log('loaded');
  return Promise.resolve();
}

module.exports = {
  load
};
