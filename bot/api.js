const Datastore = require('nedb');

class ApiClient {
  constructor(dir) {
    this.dir = dir;
    this.serverPrefixes = new Datastore({ filename: `${this.dir}/discord/server_prefixes.db`, autoload: true });
    // this.serverPrefixes.ensureIndex({ fieldName: 'id', unique: true }); // Make the id field unique to each entry
  }

  async getCustomPrefix(serverId) {
    return new Promise((resolve, reject) => {
      this.serverPrefixes.find({ id: serverId }, (err, docs) => {
        if (err) reject(err.message); // Shouldn't ever happen
        docs.length ? resolve(docs[0].prefix) : resolve(null);
      });
    });
  }

  async setCustomPrefix(serverId, newPrefix) {
    this.serverPrefixes.insert({ id: serverId, prefix: newPrefix }, err => {
      if (err && err.errorType == 'uniqueViolated') {
        this.serverPrefixes.update({ id: serverId }, { $set: { prefix: newPrefix } });
      }
    });
  }

  async removeCustomPrefix(serverId) {
    this.serverPrefixes.remove({ id: serverId }, {});
  }
}

module.exports = ApiClient;