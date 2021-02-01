'use strict';

const bunyan = require('bunyan');
const { CronJob } = require('cron');
const cronstrue = require('cronstrue');
const PromiseQueue = require('promise-queue');

const logger = bunyan.createLogger({ name: 'sequelize-salesfor-sync' });
const queue = new PromiseQueue(1, Infinity);

class Sync {
  constructor({ cron }) {
    this.queue = queue;
    this.cron = cron;
  }

  initialize() {
    logger.info('Initializing SF sync');
    if (!this.cron) return logger.info('SF sync time undefined! Aborting...');
    logger.info('Sync time set to', cronstrue.toString(this.cron).toLowerCase());
    this.queue.add(() => this.run());
    this.cron = new CronJob(this.cron, () => this.scheduleRun);
    this.cron.start();
  }

  run() {
    return Promise.resolve();
  }

  scheduleRun() {
    logger.info('SF sync cron triggered!');
    const inProgress = this.queue.getPendingLength();
    if (inProgress) return logger.info('Sync in progress, skipping iteration...');
    this.queue.add(() => this.run());
  }
}

module.exports = Sync;
