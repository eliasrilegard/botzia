import { EmbedBuilder, FetchMessagesOptions, Message, TextChannel } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Word extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'word',
      'Fetches the word count of a word by users.',
      ['[word]'],
      { aliases: ['wordcount'], cooldown: 60 }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    if (args.length === 0 || args.length > 1) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Check arguments')
        .setDescription('This command takes 1 argument.')
        .addFields({ name: 'Usage', value: this.howTo(await this.client.prefix(message), true) });
      message.channel.send({ embeds: [embed] });
      return;
    }

    const word = args[0];

    const limit = 1000; // Currently searching the latest 1000 messages in the current channel

    // Search server for every message containing word
    // Count how many messages belong to each user
    // Return top 5 users, with count of messages
    const messages = await this.getMessages(message.channel as TextChannel, limit);
    const users = messages.filter(msg => msg.content.toLowerCase().includes(word.toLowerCase())).map(msg => msg.author);
    if (users.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('No messages found')
        .setDescription('No messages were found containing the word.');
      message.channel.send({ embeds: [embed] });
      return;
    }
    const userCounts = users.reduce((counts: { [key: string]: number }, user) => {
      counts[user.id] = (counts[user.id] || 0) + 1;
      return counts;
    }, {});
    const topUsers = Object.keys(userCounts).map(key => ({ id: key, count: userCounts[key] })).sort((a, b) => b.count - a.count);
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle(`Word count: ${word}`)
      .setDescription(`${topUsers.slice(0, 5).map(user => `<@${user.id}> - ${user.count}`).join('\n')}`)
      .setFooter({ text: `Searched ${limit} messages.` });
    message.channel.send({ embeds: [embed] });
  }

  // Adapted from https://stackoverflow.com/questions/55153125/fetch-more-than-100-messages
  private async getMessages(channel: TextChannel, limit = 10000): Promise<Array<Message>> {
    const result: Array<Message> = [];
    if (limit <= 100) {
      const fetched = await channel.messages.fetch({ limit });
      fetched.forEach(msg => result.push(msg));
    }
    else {
      const rounds = (limit / 100) + (limit % 100 > 0 ? 1 : 0);
      let lastId = '';
      for (let i = 0; i < rounds; i++) {
        const options: FetchMessagesOptions = { limit: 100 };
        if (lastId) options.before = lastId;
        const fetched = await channel.messages.fetch(options);
        fetched.forEach(msg => result.push(msg));
        lastId = fetched.last()!.id;
      }
    }
    return result;
  }
}