import { DMChannel, GuildChannel, Message, MessageEmbed, PermissionResolvable } from 'discord.js';
import Bot from './bot';
import PageHandler from './pagehandler';

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
  aliases: [],
  args: true,
  belongsTo: undefined,
  category: false,
  cooldown: 3000,
  devOnly: false,
  guildOnly: false,
  permissions: ''
};

export default class Command {
  readonly name: string;
  readonly description: string;
  readonly usages: Array<string>;

  readonly aliases: Array<string>;
  readonly args: boolean;
  readonly belongsTo: string;
  readonly category: boolean;
  readonly cooldown: number;
  readonly cooldowns: Map<string, number>;
  readonly devOnly: boolean;
  readonly guildOnly: boolean;
  readonly permissions: string;

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

  async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    if (!this.category) return; // This should never happen but I'm gonna check it anyways

    const subCommandName = args.shift();

    const subCommand = client.categories.get(this.name).find(cmd => cmd.name === subCommandName || cmd.aliases.includes(subCommandName));

    if (!subCommand) {
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('Subcommand not found');
      message.channel.send({ embeds: [embed] });
      return;
    }

    if (!(await subCommand.preRunCheck(message, args, client))) return;

    try {
      subCommand.execute(message, args, client);
    }
    catch (error) {
      console.log(`The following error was caused by ${message.author.tag}:`);
      console.log(error);
    }
  }

  // Return true if all checks passed
  async preRunCheck(message: Message, args: Array<string>, client: Bot): Promise<boolean> {
    // Ignore non-dev attemps at launching dev commands
    if (this.devOnly && !client.isDev(message.author.id)) return false;

    // Check if a server-only command being triggered in a DM
    if (this.guildOnly && message.channel instanceof DMChannel) {
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('Server-only command')
        .setDescription('This command cannot be executed inside of DMs.');
      message.channel.send({ embeds: [embed] });
      return false;
    }

    // Verify user has sufficient permissions
    if (this.permissions) {
      const authorPerms = (message.channel as GuildChannel).permissionsFor(message.author);
      if ((!authorPerms || !authorPerms.has(this.permissions as PermissionResolvable)) &&
        !client.isDev(message.author.id)) {
        const embed = new MessageEmbed()
          .setColor(client.config.colors.RED)
          .setTitle('Insufficient permissions')
          .setDescription('You do not have permission to issue this command.');
        message.channel.send({ embeds: [embed] });
        return false;
      }
    }

    // Check if arguments are provided if required
    if (this.args && args.length === 0) {
      const prefix = await client.prefix(message);
      const commandUsage = this.usages.map(usage => `${prefix}${this.belongsTo ? this.belongsTo + ' ' : ''}${this.name} ${usage}`).join('\n').trim();
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('No arguments given')
        .addField('Usage: ', commandUsage)
        .addField('Description: ', this.description);
      message.channel.send({ embeds: [embed] });
      return false;
    }

    // Manage cooldown for user on command
    const expirationTime = this.cooldowns.get(message.author.id);
    if (expirationTime && !this.category) {
      const timeLeft = (expirationTime - Date.now()) / 1000;
      const embed = new MessageEmbed()
        .setColor(client.config.colors.ORANGE)
        .setTitle('Too hasty')
        .setDescription(`Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${this.name}\` again`);
      const embedMessage = await message.channel.send({ embeds: [embed] });
      setTimeout(() => embedMessage.delete(), 7000);
      return false;
    }
    if (!this.category && !client.isDev(message.author.id)) { // Avoid cooldown for category commands and devs
      this.cooldowns.set(message.author.id, Date.now() + this.cooldown);
      setTimeout(() => this.cooldowns.delete(message.author.id), this.cooldown);
    }

    return true; // All checks passed
  }

  howTo(prefix: string, codeblock = false): string {
    return `${codeblock ? '\`' : ''}${prefix}${this.belongsTo ? this.belongsTo + ' ' : ''}${this.name} ${this.usages[0]}${codeblock ? '\`' : ''}`;
  }

  protected sendMenu(message: Message, pages: Array<MessageEmbed>): PageHandler {
    return new PageHandler(message, pages, undefined, true);
  }
}