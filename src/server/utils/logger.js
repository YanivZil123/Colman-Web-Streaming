import ErrorLog from '../models/ErrorLog.js';
import mongoose from 'mongoose';

const eventLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'signup', 'upload', 'create', 'read', 'update', 'delete', 'auth_fail', 'validation_fail', 'error', 'info']
  },
  action: {
    type: String,
    required: true
  },
  userId: String,
  username: String,
  endpoint: String,
  method: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

const EventLog = mongoose.model('EventLog', eventLogSchema);

class Logger {
  async logError(error, req, context = '') {
    try {
      const errorData = {
        message: error.message || 'Unknown error',
        stack: error.stack,
        endpoint: req?.url || req?.originalUrl || context,
        method: req?.method,
        userId: req?.session?.user?.id
      };
      await ErrorLog.create(errorData);
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
  }

  async logEvent(type, action, req, details = {}) {
    try {
      const eventData = {
        type,
        action,
        userId: req?.session?.user?.id,
        username: req?.session?.user?.username,
        endpoint: req?.url || req?.originalUrl,
        method: req?.method,
        details,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent']
      };
      await EventLog.create(eventData);
    } catch (logErr) {
      console.error('Failed to log event:', logErr);
    }
  }

  async logLogin(req, username, success = true) {
    await this.logEvent('login', success ? 'User logged in' : 'Login failed', req, { username, success });
  }

  async logLogout(req) {
    await this.logEvent('logout', 'User logged out', req, {});
  }

  async logSignup(req, username) {
    await this.logEvent('signup', 'New user registered', req, { username });
  }

  async logUpload(req, filename, fileType) {
    await this.logEvent('upload', 'File uploaded', req, { filename, fileType });
  }

  async logCreate(req, resource, resourceId) {
    await this.logEvent('create', `Created ${resource}`, req, { resource, resourceId });
  }

  async logRead(req, resource, resourceId) {
    await this.logEvent('read', `Read ${resource}`, req, { resource, resourceId });
  }

  async logUpdate(req, resource, resourceId) {
    await this.logEvent('update', `Updated ${resource}`, req, { resource, resourceId });
  }

  async logDelete(req, resource, resourceId) {
    await this.logEvent('delete', `Deleted ${resource}`, req, { resource, resourceId });
  }

  async logAuthFail(req, reason) {
    await this.logEvent('auth_fail', 'Authentication failed', req, { reason });
  }

  async logValidationFail(req, errors) {
    await this.logEvent('validation_fail', 'Validation failed', req, { errors });
  }
}

export default new Logger();
export { EventLog };
