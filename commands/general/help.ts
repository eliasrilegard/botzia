import { Collection, Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Help extends Command {
  public constructor() {
    super(
      'help',
      'List all commands or get info on a specific command',
      '(command)',
      { args: false, aliases: ['commands'] }
    );
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const prefix = await client.prefix(message);

    if (args.length === 0) {
      const categories = new Array<[Command, Collection<string, Command>]>();
      const categoryNames = [...client.categories.keys()];
      categoryNames.forEach(name => categories.push([client.commands.get(name), client.categories.get(name)]));
      
      const categoryEmbeds = categories.map(category => {
        const subCommands = [...category[1].entries()].map(commandEntry =>
          `**${prefix}${category[0].name} ${commandEntry[0]}** - ${commandEntry[1].description}`
        );
        const categoryCommand = category[0];
        const embed = new MessageEmbed()
          .setColor('#0066cc')
          .setTitle(categoryCommand.description)
          .setDescription(categoryCommand.howTo(prefix))
          .addField('Avalible subcommands', subCommands.join('\n\n'));
        return embed;
      });
      
      const categoriesOverview = categories.map(category => `**${prefix}${category[0].name}** - ${category[0].description}`).join('\n');
      const standaloneCommands = client.commands
        .filter(command => !command.category && !command.devOnly)
        .map(command => `**${prefix}${command.name}** - ${command.description}`)
        .sort((a, b) => a.localeCompare(b))
        .join('\n');
      
      const mainPage = new MessageEmbed().setColor('#0066cc').setTitle('Avalible commands');
      if (categoriesOverview.length) mainPage.addField('Category commands', categoriesOverview);
      if (standaloneCommands.length) mainPage.addField('General commands', standaloneCommands);
      mainPage.addField('Additional help', `You can send ${this.howTo(prefix, true)} to get additional info on a specific command.`);

      this.sendMenu(message, [mainPage, ...categoryEmbeds]);
      return;
    }

    // Command has been specified
    const commandName = args[0].toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    const embed = new MessageEmbed();

    if (!command) {
      embed
        .setColor('#cc0000')
        .setTitle('No such command')
        .setDescription(`\`${commandName}\` is not a valid command.`);
      message.channel.send({ embeds: [embed] });
      return;
    }

    embed.setColor('#0066cc').setTitle(`Command: ${command.name}`);

    if (command.aliases.length) embed.addField('Aliases', command.aliases.join(', '));
    embed.addFields([
      { name: 'Usage', value: command.howTo(prefix) },
      { name: 'Description', value: command.description },
      { name: 'Syntax', value: '[parameter] - Mandatory parameter\n(parameter) - Optional paramater' }
    ]);


    message.channel.send({ embeds: [embed] });
  }
}

export default Help;