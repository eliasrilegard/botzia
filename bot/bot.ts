import { Client, Collection, ColorResolvable, GatewayIntentBits, Message, Partials } from 'discord.js';
import NedbClient from './database';
import Command from './command';
import ClientEvent from './event';
import MhwClient from './mhw';
import UtilityFunctions from '../utils/utilities';
import SlashCommand from './slash';

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
  readonly slashes: Collection<string, SlashCommand>;

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
    this.slashes = new Collection();

    this.database = new NedbClient(this.root.slice(0, -5).concat('database'));
    this.mhwClient = new MhwClient();

    this.loadEvents();
    this.loadCommands();
    this.loadSlashes();
  }

  private async loadEvents(): Promise<void> {
    for await (const file of UtilityFunctions.getFiles(this.root.concat('events'))) {
      const { default: EventClass } = await import(file);
      const event: ClientEvent = new EventClass();
      if (event.isOnce) this.once(event.name, (...args) => event.execute(this, ...args));
      else this.on(event.name, (...args) => event.execute(this, ...args));
    }
  }

  private async loadCommands(): Promise<void> {
    for await (const file of UtilityFunctions.getFiles(this.root.concat('commands'))) {
      const { default: CommandClass } = await import(file);
      const command: Command = new CommandClass(this);
      if (command.category) this.categories.set(command.name, new Collection());
      if (command.belongsTo) this.categories.get(command.belongsTo).set(command.name, command);
      else this.commands.set(command.name, command);
    }
  }

  private async loadSlashes(): Promise<void> {
    for await (const file of UtilityFunctions.getFiles(this.root.concat('slash'))) {
      const { default: CommandClass } = await import(file);
      const command: SlashCommand = new CommandClass(this);
      this.slashes.set(command.data.name, command);
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