import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import UtilityFunctions from '../../utils/utilities';

export default class Reload extends SlashCommand {
  constructor(client?: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('reload')
      .setDescription('Reload a command')
      .addStringOption(option => option
        .setName('command')
        .setDescription('The command to reload. Use spaces to reload a subcommand')
        .setRequired(true)
      );
    super(data, client, { belongsTo: 'dev' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandsDir = this.client.root.concat('slash');

    const commandNames = interaction.options.getString('command').toLowerCase().split(/\s+/);
    const commandName = commandNames[0];
    const command = this.client.slashCommands.get(commandName);
    
    if (!command) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Command not found');
      interaction.reply({ embeds: [embed] });
      return;
    }
    
    const files: Array<string> = [];
    for await (const file of UtilityFunctions.getFiles(commandsDir)) files.push(file);
    
    const isReloadingSubcommand = commandNames.length === 2 && command.isCategory;
    
    let subCommand: SlashCommand;
    let pathToFile: string;
    if (isReloadingSubcommand) {
      const subCommandName = commandNames[1];
      subCommand = this.client.slashCommands.find(cmd => cmd.data.name === subCommandName && cmd.belongsTo === commandName);
      if (!subCommand) {
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('Subcommand not found');
        interaction.reply({ embeds: [embed] });
        return;
      }
      pathToFile = files.find(file => file.endsWith(`${command.data.name}/${subCommand.data.name}.js`));
    }
    else pathToFile = files.find(file => file.endsWith(`${command.data.name}.js`));

    // Delete
    delete require.cache[require.resolve(pathToFile)];

    // Re-import the file
    try {
      const { default: CommandClass } = await import(pathToFile);
      const newCommand: SlashCommand = new CommandClass(this.client);
      this.client.slashCommands.set(newCommand.data.name, newCommand);
      
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.GREEN)
        .setTitle('Command reloaded')
        .setDescription(`Command \`${isReloadingSubcommand ? subCommand.data.name : command.data.name}\` was reloaded.`);
      interaction.reply({ embeds: [embed] });
    }
    catch (error) {
      console.log(error);
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Error')
        .setDescription(`Command \`${isReloadingSubcommand ? subCommand.data.name : command.data.name}\` could not be reloaded.`)
        .addFields({ name: 'Error message:', value: `\`${error.message}\`` });
      interaction.reply({ embeds: [embed] });
    }
  }
}