import { Snowflake } from 'discord.js';
import Datastore from 'nedb';

interface DocsError extends Error {
  errorType?: string;
}

export default class NedbClient {
  private readonly serverPrefixes: Datastore<{
    id: string,
    prefix: string
  }>;

  private readonly userTimezones: Datastore<{
    id: string,
    offset: string
  }>;

  private readonly reminderJobs: Datastore<{
    dueTime: string,
    channelId: string,
    messageId: string,
    userIds: Array<string>,
    message?: string
  }>;

  private readonly commandStats: Datastore<{
    name: string,
    stats: {
      [guildId: string]: {
        [userId: string]: number // Count
      }
    }
  }>;

  constructor(dir: string) {
    this.serverPrefixes = new Datastore({ filename: `${dir}/discord/server_prefixes.db`, autoload: true });
    this.userTimezones = new Datastore({ filename: `${dir}/discord/user_timezones.db`, autoload: true });
    this.reminderJobs = new Datastore({ filename: `${dir}/discord/remindme_jobs.db`, autoload: true });
    this.commandStats = new Datastore({ filename: `${dir}/discord/command_stats.db`, autoload: true });

    // Make the 'id' field unique to each entry in a Datastore
    // this.datastore.ensureIndex({ fieldName: 'id', unique: true });
    
    // setInterval(() => this.serverPrefixes.loadDatabase(), 36000000); // Refresh database every hour
  }

  reloadAll(): void {
    this.serverPrefixes.loadDatabase();
    this.userTimezones.loadDatabase();
    this.reminderJobs.loadDatabase();
    this.commandStats.loadDatabase();
  }

  // Server prefixes
  setCustomPrefix(serverId: string, newPrefix: string): void {
    this.serverPrefixes.insert({ id: serverId, prefix: newPrefix }, error => {
      if (error && (error as DocsError).errorType === 'uniqueViolated') {
        this.serverPrefixes.update({ id: serverId }, { $set: { prefix: newPrefix } });
      }
    });
  }

  async getCustomPrefix(serverId: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      this.serverPrefixes.find({ id: serverId }, (err: Error, docs: Array<{ _id: string, id: string, prefix: string }>) => {
        if (err) reject(err.message); // Shouldn't ever happen
        docs.length > 0 ? resolve(docs[0].prefix) : resolve(undefined);
      });
    });
  }
  
  removeCustomPrefix(serverId: string): void {
    this.serverPrefixes.remove({ id: serverId }, {});
  }

  // User timezones
  setUserTimezone(userId: string, offset: string): void {
    this.userTimezones.insert({ id: userId, offset }, error => {
      if (error && (error as DocsError).errorType === 'uniqueViolated') {
        this.userTimezones.update({ id: userId }, { $set: { offset } });
      }
    });
  }

  async getUserTimezone(userId: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      this.userTimezones.find({ id: userId }, (err: Error, docs: Array<{ _id: string, id: string, offset: string }>) => {
        if (err) reject(err.message);
        docs.length > 0 ? resolve(docs[0].offset) : resolve(undefined);
      });
    });
  }

  removeUserTimezone(userId: string): void {
    this.userTimezones.remove({ id: userId }, {});
  }

  // Remindme
  async setReminderJob(dueTime: string, channelId: string, messageId: string, userIds: Array<string>, message?: string): Promise<void> {
    this.reminderJobs.insert({ dueTime, channelId, messageId, userIds, message }, error => {
      // Afaik this should never happen with the way we're saving/loading
      if (error && (error as DocsError).errorType === 'uniqueViolated') {
        this.reminderJobs.update({ messageId }, { $set: { dueTime, channelId, userIds, message } });
      }
    });
  }

  getAllReminderJobs(): Array<{ dueTime: string, channelId: string, messageId: string, userIds: Array<string>, message?: string }> {
    return this.reminderJobs.getAllData();
  }

  removeReminderJob(dueTime: string): void {
    this.reminderJobs.remove({ dueTime });
  }

  // Command stats
  async incrementCommandUsage(userId: Snowflake, guildId: Snowflake, name: string, subGroup: string | null, subName: string | null): Promise<void> {
    const commandName = `${name}${subGroup != null ? ` ${subGroup}` : ''}${subName != null ? ` ${subName}` : ''}`;
    
    // Fetch command
    this.commandStats.find(
      { name: commandName },
      (
        err: Error,
        docs: Array<{ _id: string, name: string, stats: { [guildId: string]: { [userId: string]: number } } }>
      ) => {
        if (err) return console.log(err);
        
        if (docs.length === 0) {
          const stats = {
            [guildId]: {
              [userId]: 1
            }
          };
          return this.commandStats.insert({ name: commandName, stats: stats });
        }
        
        // Fetch guild
        // Fetch user
        // Increment

        
        const updatedStats = docs[0].stats;
        if (!updatedStats[guildId]) updatedStats[guildId] = { [userId]: 0 }; // Set to 0 since we increment after
        if (!updatedStats[guildId][userId]) updatedStats[guildId][userId] = 0;
        
        updatedStats[guildId][userId]++;
        
        // Store back
        this.commandStats.update({ name: commandName }, { $set: { stats: updatedStats } });
      }
    );
  }
  
  async getCommandUsage(guildId: Snowflake, commandFullName: string): Promise<Array<[Snowflake, number]>> {
    return new Promise((resolve, reject) => {
      this.commandStats.findOne(
        { name: commandFullName },
        (
          err: Error | null,
          doc: { _id: string, name: string, stats: { [guildId: string]: { [userId: string]: number } } }
        ) => {
          if (err) reject(err.message);

          const commandStats = Object.entries(doc.stats[guildId]).sort((a, b) => b[1] - a[1]); // Sort in descending order
          resolve(commandStats);

          // const commandGuildStats = doc.stats[guildId];
          // const usersUsageCount = new Map<string, number>();

          // for (const userId in commandGuildStats) usersUsageCount.set(userId, commandGuildStats[userId]);

          // resolve(usersUsageCount);
        }
      );
    });
  }
}