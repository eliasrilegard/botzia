import * as Datastore from 'nedb';

interface DocsError extends Error {
  errorType?: string;
}

export default class NedbClient {
  private readonly serverPrefixes: Datastore<{ id: string, prefix: string }>;
  private readonly userTimezones: Datastore<{ id: string, offset: string}>;
  private readonly reminderJobs: Datastore<{ dueTime: string, channelId: string, messageId: string, message: string }>;

  constructor(dir: string) {
    this.serverPrefixes = new Datastore({ filename: `${dir}/discord/server_prefixes.db`, autoload: true });
    this.userTimezones = new Datastore({ filename: `${dir}/discord/user_timezones.db`, autoload: true });
    this.reminderJobs = new Datastore({ filename: `${dir}/discord/remindme_jobs.db`, autoload: true });

    // Make the 'id' field unique to each entry in a Datastore
    // this.datastore.ensureIndex({ fieldName: 'id', unique: true });
    
    // setInterval(() => this.serverPrefixes.loadDatabase(), 36000000); // Refresh database every hour
  }

  reloadAll(): void {
    this.serverPrefixes.loadDatabase();
    this.userTimezones.loadDatabase();
    this.reminderJobs.loadDatabase();
  }

  // Server prefixes
  setCustomPrefix(serverId: string, newPrefix: string): void {
    this.serverPrefixes.insert({ id: serverId, prefix: newPrefix }, (error: DocsError) => {
      if (error && error.errorType === 'uniqueViolated') {
        this.serverPrefixes.update({ id: serverId }, { $set: { prefix: newPrefix } });
      }
    });
  }

  async getCustomPrefix(serverId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.serverPrefixes.find({ id: serverId }, (err: Error, docs: Array<{ _id: string, id: string, prefix: string }>) => {
        if (err) reject(err.message); // Shouldn't ever happen
        docs.length > 0 ? resolve(docs[0].prefix) : resolve(null);
      });
    });
  }
  
  removeCustomPrefix(serverId: string): void {
    this.serverPrefixes.remove({ id: serverId }, {});
  }

  // User timezones
  setUserTimezone(userId: string, offset: string): void {
    this.userTimezones.insert({ id: userId, offset }, (error: DocsError) => {
      if (error && error.errorType === 'uniqueViolated') {
        this.userTimezones.update({ id: userId }, { $set: { offset } });
      }
    });
  }

  async getUserTimezone(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.userTimezones.find({ id: userId }, (err: Error, docs: Array<{ _id: string, id: string, offset: string }>) => {
        if (err) reject(err.message);
        docs.length > 0 ? resolve(docs[0].offset) : resolve(null);
      });
    });
  }

  removeUserTimezone(userId: string): void {
    this.userTimezones.remove({ id: userId }, {});
  }

  // Remindme
  async setReminderJob(dueTime: string, channelId: string, messageId: string, message: string): Promise<void> {
    this.reminderJobs.insert({ dueTime, channelId, messageId, message }, (error: DocsError) => {
      // Afaik this should never happen with the way we're saving/loading
      if (error && error.errorType === 'uniqueViolated') {
        this.reminderJobs.update({ messageId }, { $set: { dueTime, channelId, message } });
      }
    });
  }

  getAllReminderJobs(): Array<{ dueTime: string, channelId: string, messageId: string, message: string }> {
    return this.reminderJobs.getAllData();
  }

  removeReminderJob(dueTime: string): void {
    this.reminderJobs.remove({ dueTime });
  }
}