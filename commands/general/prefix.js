const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class SetPrefix extends Command {
  constructor() {
    super('prefix', 'View the current prefix, or set a custom prefix for this server only', '[new prefix]', { args: false, aliases: ['setprefix'], guildOnly: true });
  }

  async execute(message, args, client) {
    const defaultPrefix = client.config['bot']['defaultPrefix'];

    const serverPrefix = await client.apiClient.getCustomPrefix(message.guild.id);

    if (!args.length) {
      const embed = new MessageEmbed()
        .setColor('0066cc')
        .setTitle('Current prefix')
        .setDescription(`The prefix for this server is \`${serverPrefix ? serverPrefix : defaultPrefix}\``);
      return message.channel.send({ embeds: [embed] });
    }

    const requestedPrefix = args[0];

    // Is prefix too long?
    if (requestedPrefix.length > 6) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Prefix too long')
        .setDescription('New prefix is too long - maximum length is 6 characters.')
        .setFooter({ text: 'Though I suggest sticking to 2 characters at max.' });
      return message.channel.send({ embeds: [embed] });
    }

    // Is user trying to reset prefix?
    if ([defaultPrefix, 'reset'].includes(requestedPrefix) && serverPrefix) {
      client.apiClient.removeCustomPrefix(message.guild.id);
      const embed = new MessageEmbed()
        .setColor('00cc00')
        .setTitle('Prefix reset')
        .setDescription(`Successfully reset prefix to default: \`${defaultPrefix}\``);
      return message.channel.send({ embeds: [embed] });
    }

    // Is the requested prefix already in use, or is the user trying to set the prefix from default to default?
    if (requestedPrefix == serverPrefix || (!serverPrefix && requestedPrefix == defaultPrefix)) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Invalid prefix')
        .setDescription('Please use a different prefix.');
      return message.channle.send({ embeds: [embed] });
    }

    client.apiClient.setCustomPrefix(message.guild.id, requestedPrefix);

    const embed = new MessageEmbed()
      .setColor('00cc00')
      .setTitle('Prefix set')
      .setDescription(`Prefix has been updated to \`${requestedPrefix}\``);
    return message.channel.send({ embeds: [embed] });
  }
}

module.exports = SetPrefix;