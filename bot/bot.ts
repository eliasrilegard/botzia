import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { Client, Collection } from 'discord.js';
import Command from './command';
import ApiClient from './api';
import ClientEvent from './event';

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

  private async loadEvents(): Promise<void> {
    for await (const file of this.getFiles(this.root.concat('events'))) {
      const { default: eventClass } = await import(file);
      const event: ClientEvent = new eventClass();
      if (event.once) this.once(event.name, (...args) => event.execute(this, ...args));
      else this.on(event.name, (...args) => event.execute(this, ...args));
    }
  }

  private async loadCommands(): Promise<void> {
    for await (const file of this.getFiles(this.root.concat('commands'))) {
      const { default: commandClass } = await import(file);
      const command: Command = new commandClass();
      this.commands.set(command.name, command);
    }
  }

  // Generator method to recursively get all files within a directory
  private async *getFiles(rootPath: string): AsyncGenerator<string> {
    const fileNames = await readdir(rootPath, { withFileTypes: true });
    for (const fileName of fileNames) {
      const path = resolve(rootPath, fileName.name);
      if (fileName.isDirectory()) yield* this.getFiles(path);
      else yield path;
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