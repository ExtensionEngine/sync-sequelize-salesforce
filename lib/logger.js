'use strict';

const Bunyan = require('bunyan');
const pkg = require('../package.json');
const Queue = require('promise-queue');
const safeRequire = require('safe-require');
const { Writable } = require('stream');

const DISABLE_MAIL_LOGGING = ['mailer', 'auth'];
const isProduction = process.env.NODE_ENV === 'production';
// NOTE: Copied from bili (by @egoist): https://git.io/fxupU
const supportsEmoji = process.platform !== 'win32' ||
process.env.TERM === 'xterm-256color';

const Level = getLevels(Bunyan);
const loggers = {};
const mailQueue = new Queue(1, Infinity);

const getLoggerName = name => name ? `${pkg.name}:${name}` : pkg.name;
const isMailLogDisabled = name => {
  return DISABLE_MAIL_LOGGING.map(getLoggerName).includes(name);
};

const errorMailer = {
  mailStream: null,
  level: Level.WARN,
  type: 'stream',
  get stream() {
    if (this.mailStream) return this.mailStream;
    const { appError } = require('../common/mail');
    const write = (error, _, callback) => {
      mailQueue.add(() => appError({ error }))
        .then(() => callback())
        .catch(callback);
    };
    this.mailStream = new Writable({ write });
    return this.mailStream;
  }
};

class Logger extends Bunyan {
  addStream(stream, defaultLevel) {
    defaultLevel = stream.level || defaultLevel;
    if (!isProduction && stream.stream === process.stdout && !supportsEmoji) {
      stream.stream = stripEmojis(stream.stream);
    }
    return super.addStream(stream, defaultLevel);
  }

  _emit(record, noemit) {
    return super._emit(record, !createLogger.enabled || noemit);
  }
}

function createLogger(name, options = {}) {
  name = getLoggerName(name);
  const serializers = { ...Bunyan.stdSerializers, ...options.serializers };
  if (loggers[name]) return loggers[name];
  loggers[name] = new Logger({ ...options, name, serializers });
  // TODO: implement error mail stream
  // if (!isMailLogDisabled(name)) loggers[name].addStream(errorMailer);
  return loggers[name];
}
Object.assign(createLogger, Logger, { enabled: true, createLogger, Level, mailQueue });

module.exports = createLogger;

function getLevels(Logger) {
  const { levelFromName: levels } = Logger;
  return Object.keys(levels).reduce((acc, name) => {
    return Object.assign(acc, { [name.toUpperCase()]: levels[name] });
  }, {});
}

function stripEmojis(stream) {
  const stripEmoji = safeRequire('emoji-strip');
  if (!stripEmoji) return stream;
  stream = map(record => {
    record.msg = stripEmoji(record.msg);
    return record;
  });
  stream.pipe(process.stdout);
  return stream;
}

function map(mapper) {
  const split = require('split2');
  return split(line => {
    const record = JSON.parse(line);
    return JSON.stringify(mapper(record)) + '\n';
  });
}
