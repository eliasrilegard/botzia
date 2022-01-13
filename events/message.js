const Event = require('../bot/event.js');
const { MessageEmbed, DMChannel } = require('discord.js');

class Message extends Event {
  constructor() {
    super('messageCreate', false);
  }

  async execute(message, client) {
    // Ignore bots
    if (message.author.bot) return;

    const prefix = await client.prefix(message);

    if (message.content.startsWith(`<@!${client.user.id}>`)) {
      const embed = new MessageEmbed()
        .setColor('00cc00')
        .setTitle('Getting started')
        .setDescription(`Use \`${prefix}help\` to get started!`);
      return message.reply({ embeds: [embed] });
    }

    if (!(message.content.startsWith(prefix) || message.content.startsWith(client.config.bot.defaultPrefix))) return; // Ignore non-commands
    
    const args = message.content.slice(prefix.length).trim().split(/ +/); // Split every word of message into list
    const commandName = args.shift().toLowerCase(); // Extract command name and finalize args list

    const command = client.commands.get(commandName) // Search for command name
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName)); // Or look for potential aliases
    if (!command) return;

    if (command.guildOnly && message.channel instanceof DMChannel) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Server-only command')
        .setDescription('This command cannot be executed inside of DMs.');
      return message.channel.send({ embeds: [embed] });
    }

    if (command.devOnly && !client.isDev(message.author.id)) return; // Ignore other attempts to trigger dev commands

    if (command.permissions) {
      const authorPerms = message.channel.permissionsFor(message.author);
      if ((!authorPerms || !authorPerms.has(command.permissions)) && (!client.isDev(message.author.id))) {
        const embed = new MessageEmbed()
          .setColor('cc0000')
          .setTitle('Insufficient permissions')
          .setDescription('You do not have permission to issue this command.');
        return message.channel.send({ embeds: [embed] });
      }
    }

    if (command.args && !args.length) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('No arguments given');
      if (command.usage) {
        embed
          .addField('Usage: ', `\`${prefix}${command.name} ${command.usage}\``)
          .addField('Description: ', command.description);
      }
      return message.channel.send({ embeds: [embed] });
    }

    const now = Date.now();
    if (command.cooldowns.has(message.author.id)) {
      const expirationTime = command.cooldowns.get(message.author.id) + command.cooldown;
      if (expirationTime - now > 0) {
        const timeLeft = (expirationTime - now) / 1000;
        const embed = new MessageEmbed()
          .setColor('cc6600')
          .setTitle('Too hasty')
          .setDescription(`Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.name}\` again`);
        return message.channel.send({ embeds: [embed] })
          .then(msg => setTimeout(() => msg.delete(), 7000));
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

module.exports = Message;