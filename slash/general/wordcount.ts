import { ChatInputCommandInteraction, EmbedBuilder, FetchMessagesOptions, Message, SlashCommandBuilder, TextChannel } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class WordCount extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('wordcount')
      .setDescription('Get the word count of a given word by users')
      .addStringOption(option => option
        .setName('word')
        .setDescription('The word to search for')
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('limit')
        .setDescription('The number of messages to search through (default 10000)')
      );
    super(data as SlashCommandBuilder, client);
  }
  
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    const word = interaction.options.getString('word')!;
    const limit = interaction.options.getInteger('limit') ?? 10000;

    if (limit > 50_000) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Limit too big')
        .setDescription('Set the limit to 50000 or less.');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const messages = await this.getMessages(interaction.channel as TextChannel, limit);
    const users = messages.filter(msg => msg.content.toLowerCase().includes(word.toLowerCase())).map(msg => msg.author);

    if (users.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('No messages found')
        .setDescription('No messages were found containing the word.');
      interaction.editReply({ embeds: [embed] });
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
    interaction.editReply({ embeds: [embed] });
  }

  // Adapted from https://stackoverflow.com/questions/55153125/fetch-more-than-100-messages
  private async getMessages(channel: TextChannel, limit: number): Promise<Array<Message>> {
    const result: Array<Message> = [];
    if (limit <= 100) {
      const fetched = await channel.messages.fetch({ limit });
      fetched.forEach(msg => result.push(msg));
      return result;
    }
    const rounds = (limit / 100) + (limit % 100 > 0 ? 1 : 0);
    let lastId = '';
    for (let i = 0; i < rounds; i++) {
      const options: FetchMessagesOptions = { limit: 100 };
      if (lastId) options.before = lastId;
      const fetched = await channel.messages.fetch(options);
      fetched.forEach(msg => result.push(msg));
      lastId = fetched.last()!.id;
      if (fetched.size < 100) break;
    }
    return result;
  }
}