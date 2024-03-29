import { AttachmentBuilder, EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';
import fetch from 'node-fetch';

export default class Color extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'color',
      'Emulates the forge color mechanic',
      ['[color string]'],
      { belongsTo: 'dd', aliases: ['colour'] }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    const colorString = args.join('');
    if (!/^([\s,]*-?\d{1,3}){1,3},*$/.test(colorString)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Invalid format')
        .setDescription('Take your character name, remove `<color:` and `>` so you\'re only entering the numbers and commas.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    const vals = colorString.match(/-?\d{1,3}/g)!.map(val => parseInt(val));

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
      .setImage('attachment://color.png');
    message.channel.send({ embeds: [embed], files: [attachment] });
  }
}