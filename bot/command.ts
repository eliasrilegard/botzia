import { Message } from 'discord.js';
import Bot from './bot';

interface ClientOptions {
  args?: boolean;
  devOnly?: boolean;
  aliases?: Array<string>;
  permissions?: string;
  guildOnly?: boolean;
  cooldown?: number;
}

const defaultOptions: ClientOptions = {
  args: true,
  devOnly: false,
  aliases: new Array(),
  permissions: '',
  guildOnly: false,
  cooldown: 3000
};

class Command {
  public name: string;
  public description: string;
  public usage: string;
  public args: boolean;
  public devOnly: boolean;
  public aliases: Array<string>;
  public permissions: string;
  public guildOnly: boolean;
  public cooldown: number;
  public cooldowns: Map<string, number>;

  protected constructor(name: string, description: string, usage: string, customOptions?: ClientOptions) {
    const options = { ...defaultOptions, ...customOptions };
    this.name = name;
    this.description = description;
    this.usage = usage;
    this.args = options.args;
    this.devOnly = options.devOnly;
    this.aliases = options.aliases;
    this.permissions = options.permissions;
    this.guildOnly = options.guildOnly;
    this.cooldown = options.cooldown;
    this.cooldowns = new Map();
  }

  public howTo(prefix: string, codeblock = false): string {
    return `${codeblock ? '\`' : ''}${prefix}${this.name} ${this.usage}${codeblock ? '\`' : ''}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public execute(message: Message, args: Array<string>, client: Bot): void {
    throw new Error('Method not implemented.');
  }
}

export default Command;