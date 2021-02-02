'use strict';

function validate() {
  console.log('validated');
  return Promise.resolve();
}

module.exports = {
  validate
};
