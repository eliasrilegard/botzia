import { AttachmentBuilder, EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Quote extends TextCommand {
  private readonly quoteMap: Map<string, string>;

  constructor(client: Bot) {
    super(
      client,
      'quote',
      'Posts a quote',
      ['[quote]', '--list'],
      { belongsTo: 'dd' }
    );
    this.quoteMap = new Map();
    this.loadQuotes();
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    if (args[0] === '--list' && args.length === 1) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.BLUE)
        .setTitle('Quote list')
        .addFields({ name: 'Here\'s a list of all available quotes', value: [...this.quoteMap.keys()].sort((a, b) => a.localeCompare(b)).join('\n') });
      message.channel.send({ embeds: [embed] });
      return;
    }
    const key = args.join('').toLowerCase();
    if (!this.quoteMap.has(key)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Quote not found');
      message.channel.send({ embeds: [embed] });
      return;
    }
    const filename = this.quoteMap.get(key)!;
    const quoteImage = new AttachmentBuilder(
      `./database/dungeon_defenders/quotes/img/${filename}`,
      { name: filename }
    );
    message.channel.send({ files: [quoteImage] });
  }

  private async loadQuotes(): Promise<void> {
    delete require.cache[require.resolve('../../database/dungeon_defenders/quotes/quotemap.json')];
    const quoteData = (await import('../../database/dungeon_defenders/quotes/quotemap.json')) as Array<{ name: string, filename: string }>;
    for (const [, v] of Object.entries(quoteData)) this.quoteMap.set(v.name, v.filename);
  }
}