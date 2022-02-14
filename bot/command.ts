import { Message, MessageEmbed } from 'discord.js';
import Bot from './bot';
import PageHandler from './pageHandler';

interface CommandOptions {
  aliases?: Array<string>;
  args?: boolean;
  belongsTo?: string;
  category?: boolean;
  cooldown?: number;
  devOnly?: boolean;
  guildOnly?: boolean;
  permissions?: string;
}

const defaultOptions: CommandOptions = {
  aliases: new Array(),
  args: true,
  belongsTo: undefined,
  category: false,
  cooldown: 3000,
  devOnly: false,
  guildOnly: false,
  permissions: ''
};

class Command {
  public name: string;
  public description: string;
  public usages: Array<string>;

  public aliases: Array<string>;
  public args: boolean;
  public belongsTo: string;
  public category: boolean;
  public cooldown: number;
  public cooldowns: Map<string, number>;
  public devOnly: boolean;
  public guildOnly: boolean;
  public permissions: string;

  protected constructor(name: string, description: string, usage: Array<string>, customOptions?: CommandOptions) {
    const options = { ...defaultOptions, ...customOptions };
    this.name = name;
    this.description = description;
    this.usages = usage;

    this.aliases = options.aliases;
    this.args = options.args;
    this.belongsTo = options.belongsTo;
    this.category = options.category;
    this.cooldown = options.cooldown;
    this.cooldowns = new Map();
    this.devOnly = options.devOnly;
    this.guildOnly = options.guildOnly;
    this.permissions = options.permissions;
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    if (!this.category) return; // This should never happen but I'm gonna check it anyways

    const subCommand = args[0];
    args = args.slice(1, args.length);

    const command = client.categories.get(this.name).find(cmd => cmd.name === subCommand || cmd.aliases.includes(subCommand));

    if (!command) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Subcommand not found');
      message.channel.send({ embeds: [embed] });
      return;
    }

    if (!(await client.preRunCheck(message, args, command))) return;

    try {
      command.execute(message, args, client);
    }
    catch (error) {
      console.log(`The following error was caused by ${message.author.tag}:`);
      console.log(error);
    }
  }

  public howTo(prefix: string, codeblock = false): string {
    return `${codeblock ? '\`' : ''}${prefix}${this.name} ${this.usages[0]}${codeblock ? '\`' : ''}`;
  }

  protected sendMenu(message: Message, pages: Array<MessageEmbed>): PageHandler {
    return new PageHandler(message, pages, undefined, true);
  }
}

export default Command;