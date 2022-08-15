import { Client, Collection, ColorResolvable, GatewayIntentBits, Message, Partials } from 'discord.js';
import { readdir } from 'fs/promises';
import { resolve } from 'path';
import NedbClient from './database';
import Command from './command';
import ClientEvent from './event';
import MhwClient from './mhw';

export interface ClientConfig {
  readonly bot: {
    readonly defaultPrefix: string;
    readonly invite: string;
  }
  readonly colors: {
    readonly [key: string]: ColorResolvable;
  }
  readonly users: {
    readonly [key: string]: string;
  }
}

export default class Bot extends Client {
  readonly root: string;
  readonly config: ClientConfig;
  readonly categories: Collection<string, Collection<string, Command>>;
  readonly commands: Collection<string, Command>;

  readonly database: NedbClient;
  readonly mhwClient: MhwClient;

  constructor(dirname: string, config: ClientConfig) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel]
    });

    this.root = dirname.slice(0, -3);
    this.config = config;
    this.categories = new Collection();
    this.commands = new Collection();

    this.database = new NedbClient(this.root.slice(0, -5).concat('database'));
    this.mhwClient = new MhwClient();

    this.loadEvents();
    this.loadCommands();
  }

  private async loadEvents(): Promise<void> {
    for await (const file of this.getFiles(this.root.concat('events'))) {
      const { default: EventClass } = await import(file);
      const event: ClientEvent = new EventClass();
      if (event.isOnce) this.once(event.name, (...args) => event.execute(this, ...args));
      else this.on(event.name, (...args) => event.execute(this, ...args));
    }
  }

  private async loadCommands(): Promise<void> {
    for await (const file of this.getFiles(this.root.concat('commands'))) {
      const { default: CommandClass } = await import(file);
      const command: Command = new CommandClass(this);
      if (command.category) this.categories.set(command.name, new Collection());
      if (command.belongsTo) this.categories.get(command.belongsTo).set(command.name, command);
      else this.commands.set(command.name, command);
    }
  }

  // Generator method to recursively get all files within a directory
  async* getFiles(rootPath: string): AsyncGenerator<string> {
    const fileNames = await readdir(rootPath, { withFileTypes: true });
    for (const fileName of fileNames) {
      const path = resolve(rootPath, fileName.name);
      if (fileName.isDirectory()) yield* this.getFiles(path);
      else yield path;
    }
  }

  async prefix(message?: Message): Promise<string> {
    const prefix = this.config.bot.defaultPrefix ? this.config.bot.defaultPrefix : '>';
    if (!message) return prefix;
    const customPrefix = await this.database.getCustomPrefix(message.guildId);
    return customPrefix ? customPrefix : prefix;
  }

  isDev(id: string): boolean {
    const devs = [
      this.config.users.chrono_id
    ];
    return devs.includes(id);
  }
}