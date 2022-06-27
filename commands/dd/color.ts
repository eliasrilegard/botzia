import { Message, MessageAttachment, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';
import fetch from 'node-fetch';

export default class Color extends Command {
  constructor() {
    super(
      'color',
      'Emulates the forge color mechanic',
      ['[color string]'],
      { belongsTo: 'dd' }
    );
  }

  async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const colorString = args.join('');
    if (!/^,*-?\d{1,3}(,*-?\d{1,3}){0,2},*$/.test(colorString)) {
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('Invalid format')
        .setDescription('Take your character name, remove `<color:` and `>` so you\'re only entering the numbers and commas.');
      message.channel.send({ embeds: [embed] });
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
    const attachment = new MessageAttachment(buffer, 'color.png');

    const embed = new MessageEmbed()
      .setColor(`#${hex}`)
      .setTitle('Resulting color')
      .setImage('attachment://color.png');
    message.channel.send({ embeds: [embed], files: [attachment] });
  }
}