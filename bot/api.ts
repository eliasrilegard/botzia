import * as Datastore from 'nedb';

interface Docs {
  id: string;
  prefix: string;
  _id: string;
}

class ApiClient {
  public readonly serverPrefixes: Datastore;

  public constructor(dir: string) {
    this.serverPrefixes = new Datastore({ filename: `${dir}/discord/server_prefixes.db`, autoload: true });
    // this.serverPrefixes.ensureIndex({ fieldName: 'id', unique: true }); // Make the id field unique to each entry

    // setInterval(() => this.serverPrefixes.loadDatabase(), 36000000); // Refresh database every hour

  }

  public async getCustomPrefix(serverId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.serverPrefixes.find({ id: serverId }, (err: Error, docs: Array<Docs>) => {
        if (err) reject(err.message); // Shouldn't ever happen
        docs.length > 0 ? resolve(docs[0].prefix) : resolve(null);
      });
    });
  }

  public async setCustomPrefix(serverId: string, newPrefix: string): Promise<void> {
    this.serverPrefixes.insert({ id: serverId, prefix: newPrefix }, err => {
      if (err && err['errorType'] === 'uniqueViolated') {
        this.serverPrefixes.update({ id: serverId }, { $set: { prefix: newPrefix } });
      }
    });
  }

  public async removeCustomPrefix(serverId: string): Promise<void> {
    this.serverPrefixes.remove({ id: serverId }, {});
  }
}

export default ApiClient;