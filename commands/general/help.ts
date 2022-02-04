import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Help extends Command {
  public constructor() {
    super('help', 'List all commands or get info on a specific command.', '[command name]', { args: false, aliases: ['commands'] });
  }

  public async execute(message: Message, args: string[], client: Bot): Promise<void> {
    const prefix = await client.prefix(message);
    const embed = new MessageEmbed().setColor('#0066cc');

    if (!args.length) {
      embed
        .setTitle('Commands')
        .addField('Here\'s a list of all avalible commands.', `\`${client.commands.filter(cmd => !cmd.devOnly).map(cmd => cmd.name).sort((a, b) => a.localeCompare(b)).join('\`, \`')}\``)
        .setFooter({ text: `You can send ${this.howTo(prefix)} to get info on a specific command.` });
      message.channel.send({ embeds: [embed] });
      return;
    }

    // Command has been specified
    const commandName = args[0].toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) {
      embed
        .setColor('#cc0000')
        .setTitle('No such command')
        .setDescription(`\`${commandName}\` is not a valid command.`);
      message.channel.send({ embeds: [embed] });
      return;
    }

    embed.setTitle(`Command info: ${command.name}`);

    const desc = new Array();
    const data = new Array();

    if (command.aliases.length) {
      desc.push('**Aliases**');
      data.push(`${command.aliases.join(', ')}`);
    }
    
    desc.push('**Description**');
    data.push(command.description);

    desc.push('**Usage**');
    data.push(command.howTo(prefix, true));

    embed.addFields(
      { name: '\u200b', value: desc.join('\n'), inline: true },
      { name: '\u200b', value: data.join('\n'), inline: true }
    );
    
    message.channel.send({ embeds: [embed] });
  }
}

export default Help;