import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Restart extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('restart')
      .setDescription('Restart the bot');
    super(data, client, { belongsTo: 'dev' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Restarting')
      .setDescription('Sent request to respawn all shards.')
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    this.client.shard.respawnAll();
  }
}