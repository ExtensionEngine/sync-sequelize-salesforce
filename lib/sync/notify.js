'use strict';

function notify() {
  console.log('notified');
  return Promise.resolve();
}

module.exports = {
  notify
};
