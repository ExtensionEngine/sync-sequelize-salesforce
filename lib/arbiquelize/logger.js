'use strict';

const reSOQL = /^SOQL\s+=\s+/;

function setLogger(connection, sfLogger, sfQueryLogger) {
  if (!sfLogger) return;
  connection.logLevel = 'DEBUG';

  connection._logger.log = (_level, message) => {
    if (sfQueryLogger && reSOQL.test(message)) {
      const query = message.replace(reSOQL, '');
      return sfQueryLogger.debug({ query });
    }
    return sfLogger.trace(message);
  };
}

module.exports = {
  setLogger
};
