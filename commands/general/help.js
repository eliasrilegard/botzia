const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class Help extends Command {
  constructor() {
    super('help', 'List all commands or get info on a specific command.', '[command name]', { args: false, aliases: ['commands'] });
  }

  async execute(message, args, client) {
    const prefix = await client.prefix(message);
    const embed = new MessageEmbed().setColor('0066cc');

    if (!args.length) {
      embed
        .setTitle('Commands')
        .addField('Here\'s a list of all avalible commands.', `\`${client.commands.filter(cmd => !cmd.devOnly).map(cmd => cmd.name).sort((a, b) => a.localeCompare(b)).join('\`, \`')}\``)
        .setFooter({ text: `You can send ${this.howTo(prefix)} to get info on a specific command.` });
      return message.channel.send({ embeds: [embed] });
    }

    // Command has been specified
    const commandName = args[0].toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(c => c.aliases && c.aliases.includes(commandName));

    if (!command) {
      embed
        .setColor('cc0000')
        .setTitle('No such command')
        .setDescription(`\`${commandName}\` is not a valid command.`);
      return message.channel.send({ embeds: [embed] });
    }

    embed.setTitle(`Command info: ${command.name}`);

    const desc = new Array();
    const data = new Array();

    if (command.aliases.length) {
      desc.push('**Aliases**\n');
      data.push(`${command.aliases.join(', ')}\n`);
    }
    desc.push('**Description**\n');
    data.push(`${command.description} \n`);

    desc.push('**Usage**\n');
    data.push(command.howTo(prefix, true));

    embed.addFields(
      { name: '\u200b', value: desc.join(''), inline: true },
      { name: '\u200b', value: data.join(''), inline: true }
    );
    
    message.channel.send({ embeds: [embed] });
  }
}

module.exports = Help;