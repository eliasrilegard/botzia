import { Collection, Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Help extends Command {
  public constructor() {
    super(
      'help',
      'List all commands or get info on a specific command',
      ['(command) (subcommand)'],
      { args: false, aliases: ['commands'] }
    );
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const prefix = await client.prefix(message);

    // No args - display interactive page to view all commands
    if (args.length === 0) {
      const categories: Array<[Command, Collection<string, Command>]> = [];
      const categoryNames = [...client.categories.keys()];
      categoryNames.forEach(name => categories.push([client.commands.get(name), client.categories.get(name)]));
      
      // Pages dedicated to individual categories
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
      
      // Build main page
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

    // Args present - command has been specified
    const commandName = args[0].toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    if (!command) return this.notFound(message, commandName, false);

    // We're looking for a subcommand if another command is specified after the first one
    const subCommandSpecified = command.category && args.length === 2;
    let subCommand: Command;
    if (subCommandSpecified) {
      const subCommandName = args[1].toLowerCase();
      const subCommands = client.categories.get(command.name);
      subCommand = subCommands.get(subCommandName) || subCommands.find(cmd => cmd.aliases.includes(subCommandName));
      if (!subCommand) return this.notFound(message, subCommandName, true);
    }

    // Build data
    const name = (subCommandSpecified ? subCommand : command).name;
    const aliases = (subCommandSpecified ? subCommand : command).aliases.join(', ');
    const commandUsage = (
      subCommandSpecified ?
        subCommand.usages.map(usage => `${prefix}${command.name} ${subCommand.name} ${usage}`) :
        command.usages.map(usage => `${prefix}${command.name} ${usage}`)
    ).join('\n').trim();
    const description = (subCommandSpecified ? subCommand : command).description + '\n\u200b';

    const embed = new MessageEmbed()
      .setColor('#0066cc')
      .setTitle(`Command: ${name}`);

    if (aliases.length) embed.addField('Aliases', aliases);
    embed.addFields([
      { name: 'Usage', value: commandUsage },
      { name: 'Description', value: description },
      { name: 'Syntax', value: '[parameter] - Mandatory\n(parameter) - Optional' }
    ]);

    message.channel.send({ embeds: [embed] });
  }

  private notFound(message: Message, name: string, isSubCommand: boolean): void {
    const embed = new MessageEmbed()
      .setColor('#cc0000')
      .setTitle('Command not found')
      .setDescription(`There is no ${isSubCommand ? 'sub' : ''}command with name or alias \`${name}\`.`);
    message.channel.send({ embeds: [embed] });
  }
}

export default Help;