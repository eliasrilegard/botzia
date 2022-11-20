import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Levels extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('levels')
      .setDescription('List all levels with plane unlocks');
    super(data, client, { belongsTo: 'pp' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const planes = [...this.client.pocketPlanes.planes.values()]
      .filter(plane => plane.level !== undefined)
      .sort((a, b) => a.level! - b.level!);

    const levels = [...new Set(planes.map(plane => plane.level!))];

    const output = levels.map(lvl => `Level **${lvl}**: ${planes.filter(plane => plane.level === lvl).map(plane => plane.name).join(', ')}`);
    
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Levels')
      .setDescription(`Every level or two, new planes are unlocked!\n\n${output.join('\n')}`);
    interaction.reply({ embeds: [embed] });
  }
}