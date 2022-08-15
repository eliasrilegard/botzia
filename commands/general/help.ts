import { Collection, EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class Help extends Command {
  constructor(client: Bot) {
    super(
      client,
      'help',
      'List all commands or get info on a specific command',
      ['(command) (subcommand)'],
      { args: false, aliases: ['commands'] }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    const prefix = await this.client.prefix(message);

    // No args - display interactive page to view all commands
    if (args.length === 0) {
      const categories: Array<[Command, Collection<string, Command>]> = [];
      const categoryNames = [...this.client.categories.keys()];
      categoryNames.forEach(name => categories.push([this.client.commands.get(name), this.client.categories.get(name)]));
      
      // Pages dedicated to individual categories
      const categoryEmbeds = categories.map(category => {
        const subCommands = [...category[1].entries()].map(commandEntry =>
          `**${prefix}${category[0].name} ${commandEntry[0]}** - ${commandEntry[1].description}`
        );
        const categoryCommand = category[0];
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.BLUE)
          .setTitle(categoryCommand.description)
          .setDescription(categoryCommand.howTo(prefix))
          .addFields({ name: 'Avalible subcommands', value: subCommands.join('\n\n') });
        return embed;
      });
      
      // Build main page
      const categoriesOverview = categories.map(category => `**${prefix}${category[0].name}** - ${category[0].description}`).join('\n');
      const standaloneCommands = this.client.commands
        .filter(command => !command.category && !command.devOnly)
        .map(command => `**${prefix}${command.name}** - ${command.description}`)
        .sort((a, b) => a.localeCompare(b))
        .join('\n');
      
      const mainPage = new EmbedBuilder().setColor(this.client.config.colors.BLUE).setTitle('Avalible commands');
      if (categoriesOverview.length) mainPage.addFields({ name: 'Category commands', value: categoriesOverview });
      if (standaloneCommands.length) mainPage.addFields({ name: 'General commands', value: standaloneCommands });
      mainPage.addFields({ name: 'Additional help', value: `You can send ${this.howTo(prefix, true)} to get additional info on a specific command.` });

      this.sendMenu(message, [mainPage, ...categoryEmbeds]);
      return;
    }

    // Args present - command has been specified
    const commandName = args[0].toLowerCase();
    const command = this.client.commands.get(commandName) || this.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    if (!command) return this.notFound(message, commandName, false);

    // We're looking for a subcommand if another command is specified after the first one
    const subCommandSpecified = command.category && args.length === 2;
    let subCommand: Command;
    if (subCommandSpecified) {
      const subCommandName = args[1].toLowerCase();
      const subCommands = this.client.categories.get(command.name);
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

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle(`Command: ${name}`);

    if (aliases.length) embed.addFields({ name: 'Aliases', value: aliases });
    embed.addFields([
      { name: 'Usage', value: commandUsage },
      { name: 'Description', value: description },
      { name: 'Syntax', value: '[parameter] - Mandatory\n(parameter) - Optional' }
    ]);

    message.channel.send({ embeds: [embed] });
  }

  private notFound(message: Message, name: string, isSubCommand: boolean): void {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.RED)
      .setTitle('Command not found')
      .setDescription(`There is no ${isSubCommand ? 'sub' : ''}command with name or alias \`${name}\`.`);
    message.channel.send({ embeds: [embed] });
  }
}