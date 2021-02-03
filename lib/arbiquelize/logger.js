'use strict';

const { createLogger, Level } = require('../logger');

const logger = createLogger('sf', { level: Level.DEBUG });
const queryLogger = createLogger('sf:soql', { level: Level.DEBUG });
const reSOQL = /^SOQL\s+=\s+/;

function setLogger(connection) {
  connection.logLevel = 'DEBUG';

  connection._logger.log = (_level, message) => {
    if (reSOQL.test(message)) {
      const query = message.replace(reSOQL, '');
      return queryLogger.debug({ query });
    }
    return logger.trace(message);
  };
}

module.exports = {
  setLogger
};
