import * as Datastore from 'nedb';

interface Docs {
  _id: string;
  id?: string;
  prefix?: string;
  offset?: string;
}

export default class ApiClient {
  readonly serverPrefixes: Datastore;
  readonly userTimezones: Datastore;

  constructor(dir: string) {
    this.serverPrefixes = new Datastore({ filename: `${dir}/discord/server_prefixes.db`, autoload: true });
    this.userTimezones = new Datastore({ filename: `${dir}/discord/user_timezones.db`, autoload: true });

    // Make the id field unique to each entry
    // this.serverPrefixes.ensureIndex({ fieldName: 'id', unique: true });
    // this.userTimezones.ensureIndex({ fieldName: 'id', unique: true });

    // setInterval(() => this.serverPrefixes.loadDatabase(), 36000000); // Refresh database every hour
  }

  // TODO: Refactor to avoid duplicate code

  // Server prefixes
  async getCustomPrefix(serverId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.serverPrefixes.find({ id: serverId }, (err: Error, docs: Array<Docs>) => {
        if (err) reject(err.message); // Shouldn't ever happen
        docs.length > 0 ? resolve(docs[0].prefix) : resolve(null);
      });
    });
  }

  async setCustomPrefix(serverId: string, newPrefix: string): Promise<void> {
    this.serverPrefixes.insert({ id: serverId, prefix: newPrefix }, err => {
      if (err && err['errorType'] === 'uniqueViolated') {
        this.serverPrefixes.update({ id: serverId }, { $set: { prefix: newPrefix } });
      }
    });
  }

  async removeCustomPrefix(serverId: string): Promise<void> {
    this.serverPrefixes.remove({ id: serverId }, {});
  }

  // User timezones
  async getUserTimezone(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.userTimezones.find({ id: userId }, (err: Error, docs: Array<Docs>) => {
        if (err) reject(err.message);
        docs.length > 0 ? resolve(docs[0].offset) : resolve(null);
      });
    });
  }

  async setUserTimezone(userId: string, offset: string): Promise<void> {
    this.userTimezones.insert({ id: userId, offset }, err => {
      if (err && err['errorType'] === 'uniqueViolated') {
        this.userTimezones.update({ id: userId }, { $set: { offset } });
      }
    });
  }

  async removeUserTimezone(userId: string): Promise<void> {
    this.userTimezones.remove({ id: userId }, {});
  }
}