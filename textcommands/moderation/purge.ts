import { BaseGuildTextChannel, EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Purge extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'purge',
      'Clears a specified number of messages.',
      ['[# of messages to remove - max 99]'],
      { permissions: 'MANAGE_MESSAGES', guildOnly: true }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    const count = parseInt(args[0]) + 1;

    if (count < 2 || count > 100 || isNaN(count)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Invalid argument')
        .setDescription('Specify a number between 1 and 99.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    try { await (message.channel as BaseGuildTextChannel).bulkDelete(count) }
    catch (error) {
      console.log(error); // TODO Replace with logger
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Error')
        .setDescription('An error was encountered while trying to delete messages.')
        .addFields({ name: 'Error message', value: error instanceof Error ? error.message : 'Error' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    const successEmbed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Success')
      .setDescription(`Successfully deleted ${count} messages.`);
    const successMsg = await message.channel.send({ embeds: [successEmbed] });
    setTimeout(() => successMsg.delete(), 7000);
  }
}