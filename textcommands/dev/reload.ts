import { Collection, EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';
import UtilityFunctions from '../../utils/utilities';

export default class Reload extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'reload',
      'Reloads a command!',
      ['[command name]', '-b, --build [path/to/file]'],
      { devOnly: true }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    const commandsDir = this.client.root.concat('textcommands');

    if (['-b', '--build'].includes(args[0])) {
      if (args.length !== 2) return;
      const embed = new EmbedBuilder();
      const pathToFile = args[1];
      try {
        const { default: CommandClass } = await import(`${commandsDir}/${pathToFile}.js`);
        const command: TextCommand = new CommandClass(this.client);
        if (command.category) this.client.textCommandCategories.set(command.name, new Collection());
        if (command.belongsTo) this.client.textCommandCategories.get(command.belongsTo)!.set(command.name, command);
        else this.client.textCommands.set(command.name, command);
        embed
          .setColor(this.client.config.colors.GREEN)
          .setTitle('Command added')
          .setDescription(`Successfully built the command \`textcommands/${pathToFile}.js\`.`);
      }
      catch (error) {
        const isNormal = error instanceof Error;
        embed
          .setColor(this.client.config.colors.RED)
          .setTitle('No such file')
          .setDescription(`The file \`textcommands/${pathToFile}.js\` couldn't be located.`)
          .addFields({ name: 'Error message', value: isNormal ? error.message : 'Critical error' });
        if (!isNormal) console.error(error);
      }
      message.channel.send({ embeds: [embed] });
      return;
    }

    // Get command name or alias
    const commandName = args[0].toLowerCase();
    const command = this.client.textCommands.get(commandName) ||
    this.client.textCommands.find(cmd => cmd.aliases.includes(commandName));

    if (!command) return this.notFound(message, commandName, false);

    const files: Array<string> = [];
    for await (const file of UtilityFunctions.getFiles(commandsDir)) files.push(file);

    // This might need to be > 1 if we're allowing sub-subcommands
    const isReloadingSubCommand = command.category && args.length === 2;

    let subCommandFound: TextCommand;
    let pathToFile: string;
    if (isReloadingSubCommand) {
      // If we're reloading a subcommand we're gonna have to do everything pretty much once again
      const subCommandName = args[1];
      const subCommands = this.client.textCommandCategories.get(command.name)!;
      const subCommand = subCommands.get(subCommandName) || subCommands.find(cmd => cmd.aliases.includes(subCommandName));
      if (!subCommand) return this.notFound(message, subCommandName, true);
      pathToFile = files.filter(file => file.endsWith(`${command.name}/${subCommand.name}.js`))[0];
      subCommandFound = subCommand;
    }
    else pathToFile = files.filter(file => file.endsWith(`${command.name}.js`))[0];

    // Delete
    delete require.cache[require.resolve(pathToFile)];

    // Re-import the file
    try {
      const { default: CommandClass } = await import(pathToFile);
      const newCommand: TextCommand = new CommandClass(this.client);
      if (command.category) this.client.textCommandCategories.get(command.name)!.set(newCommand.name, newCommand);
      else this.client.textCommands.set(newCommand.name, newCommand);

      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.GREEN)
        .setTitle('Command reloaded')
        .setDescription(`Command \`${isReloadingSubCommand ? subCommandFound!.name : command.name}\` was reloaded.`);
      message.channel.send({ embeds: [embed] });
    }
    catch (error) {
      console.log(error);
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Error')
        .setDescription(`Command \`${isReloadingSubCommand ? subCommandFound!.name : command.name}\` could not be reloaded.`)
        .addFields({ name: 'Error message:', value: `\`${error instanceof Error ? error.message : 'Critical error'}\`` });
      message.channel.send({ embeds: [embed] });
    }
  }

  private notFound(message: Message, name: string, isSubCommand: boolean): void {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.RED)
      .setTitle('Command not found')
      .setDescription(`There is no ${isSubCommand ? 'sub' : ''}command with name or alias \`${name}\`.`);
    message.channel.send({ embeds: [embed] });
  }
}