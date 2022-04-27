import { Message, MessageAttachment, MessageEmbed } from 'discord.js';
import Command from '../../bot/command';
import * as quoteData from '../../database/dungeon_defenders/quotes/quoteMap.json';

class Quote extends Command {
  private readonly quoteMap: Map<string, string>;

  public constructor() {
    super(
      'quote',
      'Posts a quote',
      ['[quote]'],
      { belongsTo: 'dd' }
    );
    this.quoteMap = new Map();
    for (const [, v] of Object.entries(quoteData)) this.quoteMap.set(v.name, v.filepath);
  }

  public async execute(message: Message, args: Array<string>): Promise<void> {
    const key = args.join('').toLowerCase();
    if (!this.quoteMap.has(key)) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Quote not found');
      message.channel.send({ embeds: [embed] });
      return;
    }
    const filepath = this.quoteMap.get(key);
    const quoteImage = new MessageAttachment(
      filepath,
      filepath.slice(filepath.lastIndexOf('/') + 1).replace(/[',\s-]/g, '') // See mhw/hzv
    );
    message.channel.send({ files: [quoteImage] });
  }
}

export default Quote;