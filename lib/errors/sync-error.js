'use strict';

class SyncError extends Error {
  constructor(message) {
    super(message);
    this.createdAt = Date.now();
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = SyncError;
