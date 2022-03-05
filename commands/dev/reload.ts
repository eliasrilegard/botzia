import { Collection, Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Reload extends Command {
  public constructor() {
    super(
      'reload',
      'Reloads a command!',
      ['[command name]', '-b, --build [path/to/file]'],
      { devOnly: true }
    );
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const commandsDir = client.root.concat('commands');

    if (['-b', '--build'].includes(args[0])) {
      if (args.length !== 2) return;
      const embed = new MessageEmbed();
      const pathToFile = args[1];
      try {
        const { default: CommandClass } = await import(`${commandsDir}/${pathToFile}.js`);
        const command: Command = new CommandClass();
        if (command.category) client.categories.set(command.name, new Collection());
        if (command.belongsTo) client.categories.get(command.belongsTo).set(command.name, command);
        else client.commands.set(command.name, command);
        embed
          .setColor('#00cc00')
          .setTitle('Command added')
          .setDescription(`Successfully built the command \`commands/${pathToFile}.js\`.`);
      }
      catch (error) {
        embed
          .setColor('#cc0000')
          .setTitle('No such file')
          .setDescription(`The file \`commands/${pathToFile}.js\` couldn't be located.`)
          .addField('Error message', error.message);
      }
      message.channel.send({ embeds: [embed] });
      return;
    }

    // Get command name or alias
    const commandName = args[0].toLowerCase();
    const command = client.commands.get(commandName) ||
      client.commands.find(cmd => cmd.aliases.includes(commandName));

    if (!command) return this.notFound(message, commandName, false);

    const files: Array<string> = [];
    for await (const file of client.getFiles(commandsDir)) files.push(file);

    // This might need to be > 1 if we're allowing sub-subcommands
    const isReloadingSubcommand = command.category && args.length === 2;

    let subCommand: Command;
    let pathToFile: string;
    if (isReloadingSubcommand) {
      // If we're reloading a subcommand we're gonna have to do everything pretty much once again
      const subCommandName = args[1];
      const subCommands = client.categories.get(command.name);
      subCommand = subCommands.get(subCommandName) || subCommands.find(cmd => cmd.aliases.includes(subCommandName));
      if (!subCommand) return this.notFound(message, subCommandName, true);
      pathToFile = files.filter(file => file.endsWith(`${command.name}/${subCommand.name}.js`))[0];
    }
    else pathToFile = files.filter(file => file.endsWith(`${command.name}.js`))[0];

    // Delete
    delete require.cache[require.resolve(pathToFile)];

    // Re-import the file
    try {
      const { default: CommandClass } = await import(pathToFile);
      const newCommand: Command = new CommandClass();
      if (command.category) client.categories.get(command.name).set(newCommand.name, newCommand);
      else client.commands.set(newCommand.name, newCommand);

      const embed = new MessageEmbed()
        .setColor('#00cc00')
        .setTitle('Command reloaded')
        .setDescription(`Command \`${isReloadingSubcommand ? subCommand.name : command.name}\` was reloaded.`);
      message.channel.send({ embeds: [embed] });
    }
    catch (error) {
      console.log(error);
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Error')
        .setDescription(`Command \`${isReloadingSubcommand ? subCommand.name : command.name}\` could not be reloaded.`)
        .addField('Error message:', `\`${error.message}\``);
      message.channel.send({ embeds: [embed] });
    }
  }

  private notFound(message: Message, name: string, isSubCommand: boolean): void {
    const embed = new MessageEmbed()
      .setColor('#cc0000')
      .setTitle('Command not found')
      .setDescription(`There is no ${isSubCommand ? 'sub' : ''}command with name or alias \`${name}\`.`);
    message.channel.send({ embeds: [embed] });
  }
}

export default Reload;