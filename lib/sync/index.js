'use strict';

const bunyan = require('bunyan');
const { CronJob } = require('cron');
const cronstrue = require('cronstrue');
const PromiseQueue = require('promise-queue');
const SyncModule = require('./sync-module');
const transform = require('lodash/transform');

const logger = bunyan.createLogger({ name: 'sequelize-salesforce-sync' });
const queue = new PromiseQueue(1, Infinity);

const bindModules = (src, module) =>
  Object.entries(module).map(([k, v]) => (src[k] = v.bind(src)));

class Sync {
  constructor({ cronTime, sfModels }) {
    this.queue = queue;
    this.cronTime = cronTime;
    this.sfModels = sfModels;
    bindModules(this, require('./pull'));
    bindModules(this, require('./validate'));
    bindModules(this, require('./load'));
    bindModules(this, require('./notify'));
  }

  initialize() {
    logger.info('Initializing SF sync');
    if (!this.cronTime) return logger.info('SF sync time undefined! Aborting...');
    logger.info('SF sync time set to', cronstrue.toString(this.cronTime).toLowerCase());
    this.queue.add(() => this.run());
    this.scheduleJob();
  }

  scheduleJob() {
    this.cron = new CronJob(this.cronTime, () => {
      logger.info('SF sync cron triggered!');
      const inProgress = this.queue.getPendingLength();
      if (inProgress) return logger.info('Sync in progress, skipping iteration...');
      this.queue.add(() => this.run());
    });
    this.cron.start();
  }

  async run() {
    this.syncModules = transform(this.sfModels, (acc, Model) => {
      acc[Model.name] = new SyncModule({ Model, sync: this });
    }, {});
    await this.pull();
    await this.validate();
    await this.load();
    return this.notify();
  }
}

module.exports = Sync;
