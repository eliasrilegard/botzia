import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class XP extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('xp')
      .setDescription('Calculate the XP required to level up')
      .addIntegerOption(option => option
        .setName('level')
        .setDescription('Current level')
        .setRequired(true)
      );
    super(data, client, { belongsTo: 'pp' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const level = interaction.options.getInteger('level')!;

    const xpNeeded = 100 * Math.ceil(Math.pow(level, 3) + 1.5 * Math.pow(level, 2) + level + 10);

    const nf = Intl.NumberFormat('en-CA');

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('XP')
      .setDescription(`At level **${level}**, it takes **${nf.format(xpNeeded)}** XP to reach level **${level + 1}**.`);
    interaction.reply({ embeds: [embed] });
  }
}