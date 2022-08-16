import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import fetch from 'node-fetch';

export default class Color extends SlashCommand {
  constructor(client?: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('color')
      .setDescription('Emulate the forge color mechanic')
      .addStringOption(option => option
        .setName('color-string')
        .setDescription('The color string (the text between <color: and >)')
        .setRequired(true)
      );
    super(data, client, { belongsTo: 'dd' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const colorString = interaction.options.getString('color-string');
    if (!/^[,\s]*-?\d{1,3}([,\s]*-?\d{1,3}){0,2}[,\s]*$/.test(colorString)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Invalid format')
        .setDescription('Take your character name, remove `<color:` and `>` so you\'re only entering the numbers and commas.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    const vals = colorString.match(/-?\d{1,3}/g).map(val => parseInt(val));

    for (let i = 0; i < vals.length; i++) {
      while (vals[i] < 0) vals[i] += 255;
      while (vals[i] > 255) vals[i] -= 255;
    }

    const hexifier = (x: number) => x.toString(16).padStart(2, '0');
    const hex = hexifier(vals[0]) + hexifier(vals[1] ?? 255) + hexifier(vals[2] ?? 255);
    const apiKey = `https://singlecolorimage.com/get/${hex}/200x200`;

    const response = await fetch(apiKey);
    const buffer = await response.buffer();
    const attachment = new AttachmentBuilder(buffer, { name: 'color.png' });

    const embed = new EmbedBuilder()
      .setColor(`#${hex}`)
      .setTitle('Resulting color')
      .setDescription(`\`<color:${vals.join(',')}>\` is equivalent to \`<color:${vals[0]},${vals[1] ?? 255},${vals[2] ?? 255}>\``)
      .setImage('attachment://color.png');
    interaction.reply({ embeds: [embed], files: [attachment] });
  }
}