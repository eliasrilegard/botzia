import { readdirSync } from 'fs';
import { Client, Collection } from 'discord.js';
import Command from './command';
import ApiClient from './api';

interface ClientConfig {
  bot: { // Sort of a tempfix hehe
    defaultPrefix: string;
    invite: string;
  };
  users: {
    chrono_id: string;
    chrono_tag: string;
  }
}

class Bot extends Client {
  public root: string;
  public config: ClientConfig;
  public commands: Collection<string, Command>;
  public tokens: Collection<string, string>;
  public apiClient: ApiClient;

  public constructor(dirname: string, config: ClientConfig) {
    super({
      intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_INVITES', 'GUILD_PRESENCES', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS'],
      partials: ['CHANNEL']
    });

    this.root = dirname.slice(0, -3);
    this.config = config;
    this.commands = new Collection();
    this.tokens = new Collection();

    this.apiClient = new ApiClient(this.root.slice(0, -5).concat('database'));

    this.loadEvents();
    this.loadCommands();
  }

  private async loadEvents() {
    const eventFiles = readdirSync(this.root.concat('events')).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
      const { default: eventClass } = await import(this.root.concat(`events/${file}`));
      const event = new eventClass();
      if (event.once) this.once(event.name, (...args) => event.execute(...args, this));
      else this.on(event.name, (...args) => event.execute(...args, this));
    }
  }

  private async loadCommands() {
    const commandFolders = readdirSync(this.root.concat('commands'));
    for (const folder of commandFolders) {
      const commandFiles = readdirSync(this.root.concat(`commands/${folder}`)).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        const { default: commandClass } = await import(this.root.concat(`commands/${folder}/${file}`));
        const command = new commandClass();
        this.commands.set(command.name, command);
      }
    }
  }

  public async prefix(message = undefined): Promise<string> {
    const prefix = this.config.bot.defaultPrefix ? this.config.bot.defaultPrefix : '>';
    if (!message) return prefix;
    const customPrefix = await this.apiClient.getCustomPrefix(message.guildId);
    return customPrefix ? customPrefix : prefix;
  }

  public isDev(id: string): boolean {
    const devs = [
      this.config.users.chrono_id
    ];
    return devs.includes(id);
  }
}

export default Bot;