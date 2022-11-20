import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class SpongeText extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('spongetext')
      .setDescription('Convert text into sPOnGe cASe')
      .addStringOption(option => option
        .setName('text')
        .setDescription('The text to convert')
        .setRequired(true)
      );

    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const input = interaction.options.getString('text')!;
    let output = '';

    const data = Array.from({ length: input.match(/\S/g)!.length }, () => false);

    // First two characters are always different
    data[0] = Math.random() < 0.5;
    data[1] = !data[0];

    for (let i = 2; i < data.length; i++) {
      // No more than two consecutive upper/lower case characters in a row
      if (data[i - 1] === data[i - 2]) {
        data[i] = !data[i - 1];
        continue;
      }
      data[i] = Math.random() < 0.5;
    }

    let j = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === ' ') {
        output += ' ';
        continue;
      }
      output += data[j++] ? input[i].toUpperCase() : input[i].toLowerCase();
      // Increase j only when used
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Here\'s your converted text')
      .setDescription(output);

    interaction.reply({ embeds: [embed], ephemeral: true });
  }
}