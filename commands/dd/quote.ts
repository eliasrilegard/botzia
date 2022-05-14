import { Message, MessageAttachment, MessageEmbed } from 'discord.js';
import Command from '../../bot/command';

class Quote extends Command {
  private readonly quoteMap: Map<string, string>;

  public constructor() {
    super(
      'quote',
      'Posts a quote',
      ['[quote]', '--list'],
      { belongsTo: 'dd' }
    );
    this.quoteMap = new Map();
    this.loadQuotes();
  }

  public async execute(message: Message, args: Array<string>): Promise<void> {
    if (args[0] === '--list' && args.length === 1) {
      const embed = new MessageEmbed()
        .setColor('#0066cc')
        .setTitle('Quote list')
        .addField('Here\'s a list of all avalible quotes', [...this.quoteMap.keys()].sort((a, b) => a.localeCompare(b)).join('\n'));
      message.channel.send({ embeds: [embed] });
      return;
    }
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

  private async loadQuotes(): Promise<void> {
    delete require.cache[require.resolve('../../database/dungeon_defenders/quotes/quotemap.json')];
    const quoteData = await import('../../database/dungeon_defenders/quotes/quotemap.json');
    for (const [, v] of Object.entries(quoteData)) this.quoteMap.set(v.name, v.filepath);
  }
}

export default Quote;