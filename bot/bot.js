const fs = require('fs');
const { Client, Collection } = require('discord.js');
const config = require('../config.json');

class Bot extends Client {
  constructor() {
    super({
      intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_INVITES', 'GUILD_PRESENCES', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS'],
      partials: ['CHANNEL']
    });
    this.commands = new Collection();
    this.tokens = new Collection();
  }

  prefix(message = undefined) {
    const prefix = config['bot']['defaultPrefix'];
    if (!message) return prefix;
  }

  loadEvents(dir) {
    const eventFiles = fs.readdirSync(dir).filter(file => file.endsWith(".js"));
    for (let file of eventFiles) {
      const eventClass = require(`${dir}/${file}`);
      const event = new eventClass();
      if (event.once) this.once(event.name, (...args) => event.execute(...args, client));
      else this.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  loadCommands(parentDir) {
    const commandFolders = fs.readdirSync(parentDir);
    commandFolders.forEach(folder => {
      const commandFiles = fs.readdirSync(`${parentDir}/${folder}`).filter(file => file.endsWith('.js'));
      commandFiles.forEach(file => {
        const commandClass = require(`${parentDir}/${folder}/${file}`);
        const command = new commandClass();
        this.commands.set(command.name, command);
      });
    });
  }

  isDev(id) {
    const devs = [
      config['users']['chrono_id']
    ];
    return devs.includes(id);
  }
}

module.exports = Bot;