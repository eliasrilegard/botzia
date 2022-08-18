import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Build extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('build')
      .setDescription('Build a command')
      .addStringOption(option => option
        .setName('path')
        .setDescription('path/to/file for the command to build')
        .setRequired(true)
      );
    super(data, client, { belongsTo: 'dev' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandsDir = this.client.root.concat('slash');
    const path = interaction.options.getString('path');

    const embed = new EmbedBuilder();
    try {
      const { default: CommandClass } = await import(`${commandsDir}/${path}.js`);
      const command: SlashCommand = new CommandClass(this.client);
      this.client.slashCommands.set(command.data.name, command);

      embed
        .setColor(this.client.config.colors.GREEN)
        .setTitle('Command added')
        .setDescription(`Successfully built the command \`slash/${path}.js\`.`);
    }
    catch (error) {
      embed
        .setColor(this.client.config.colors.RED)
        .setTitle('No such file')
        .setDescription(`The file \`commands/${path}.js\` couldn't be located.`)
        .addFields({ name: 'Error message', value: error instanceof Error ? error.message : 'Critical error' });
    }
    interaction.reply({ embeds: [embed] });
  }
}