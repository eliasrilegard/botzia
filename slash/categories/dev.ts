import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Dev extends SlashCommand {
  constructor(client?: Bot) {
    const data = new SlashCommandBuilder()
      .setName('dev')
      .setDescription('Development commands')
      .setDefaultMemberPermissions(0);
    super(data, client, { isCategory: true });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!this.client.isDev(interaction.user.id)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Developer only command');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Continue as usual
    const subCommands = this.client.slashCommands.filter(cmd => cmd.belongsTo === this.data.name);
    const subCommandName = interaction.options.getSubcommand();
    const subCommand = subCommands.get(subCommandName);
    subCommand.execute(interaction);
  }
}