'use strict';

function pull() {
  console.log('pulled');
  return Promise.resolve();
}

module.exports = {
  pull
};
