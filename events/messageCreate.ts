import { DMChannel, GuildChannel, Message, MessageEmbed, PermissionResolvable } from 'discord.js';
import Bot from '../bot/bot';
import ClientEvent from '../bot/event';

class MessageCreate extends ClientEvent {
  public constructor() {
    super('messageCreate', false);
  }

  public async execute(client: Bot, message: Message): Promise<void> {
    // Ignore bots
    if (message.author.bot) return;

    const prefix = await client.prefix(message);

    if (message.content.startsWith(`<@!${client.user.id}>`)) {
      const embed = new MessageEmbed()
        .setColor('#00cc00')
        .setTitle('Getting started')
        .setDescription(`Use \`${prefix}help\` to get started!`);
      message.reply({ embeds: [embed] });
      return;
    }

    if (!(message.content.startsWith(prefix) || message.content.startsWith(client.config.bot.defaultPrefix))) return; // Ignore non-commands

    const args = message.content.slice(prefix.length).trim().split(/ +/); // Split every word of message into list
    const commandName = args.shift().toLowerCase(); // Extract command name and finalize args list

    const command = client.commands.get(commandName) || // Search for command name
      client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName)); // Or look for potential aliases
    if (!command) return;

    if (command.guildOnly && message.channel instanceof DMChannel) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Server-only command')
        .setDescription('This command cannot be executed inside of DMs.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    if (command.devOnly && !client.isDev(message.author.id)) return; // Ignore other attempts to trigger dev commands

    if (command.permissions) {
      const authorPerms = (message.channel as GuildChannel).permissionsFor(message.author);
      if ((!authorPerms || !authorPerms.has(command.permissions as PermissionResolvable)) &&
        (!client.isDev(message.author.id))) {
        const embed = new MessageEmbed()
          .setColor('#cc0000')
          .setTitle('Insufficient permissions')
          .setDescription('You do not have permission to issue this command.');
        message.channel.send({ embeds: [embed] });
        return;
      }
    }

    if (command.args && !args.length) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('No arguments given');
      if (command.usage) {
        embed
          .addField('Usage: ', `\`${prefix}${command.name} ${command.usage}\``)
          .addField('Description: ', command.description);
      }
      message.channel.send({ embeds: [embed] });
      return;
    }

    const now = Date.now();
    if (command.cooldowns.has(message.author.id)) {
      const expirationTime = command.cooldowns.get(message.author.id) + command.cooldown;
      if (expirationTime - now > 0) {
        const timeLeft = (expirationTime - now) / 1000;
        const embed = new MessageEmbed()
          .setColor('#cc6600')
          .setTitle('Too hasty')
          .setDescription(`Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.name}\` again`);
        const embedMessage = await message.channel.send({ embeds: [embed] });
        setTimeout(() => embedMessage.delete(), 7000);
        return;
      }
    }
    command.cooldowns.set(message.author.id, now);
    setTimeout(() => command.cooldowns.delete(message.author.id), command.cooldown);

    try {
      command.execute(message, args, client);
    }
    catch (error) {
      console.log(`The following error was caused by ${message.author.tag}:`);
      console.log(error);
    }
  }
}

export default MessageCreate;