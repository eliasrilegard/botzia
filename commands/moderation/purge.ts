import { BaseGuildTextChannel, Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class Purge extends Command {
  constructor() {
    super(
      'purge',
      'Clears a specified number of messages.',
      ['[# of messages to remove - max 99]'],
      { permissions: 'MANAGE_MESSAGES', guildOnly: true }
    );
  }

  async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const count = parseInt(args[0]) + 1;

    if (count < 2 || count > 100 || isNaN(count)) {
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('Invalid argument')
        .setDescription('Specify a number between 1 and 99.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    try { await (message.channel as BaseGuildTextChannel).bulkDelete(count) }
    catch (error) {
      console.log(error); // TODO Replace with logger
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('Error')
        .setDescription('An error was encountered while trying to delete messages.')
        .addField('Error message', error);
      message.channel.send({ embeds: [embed] });
      return;
    }
    const successEmbed = new MessageEmbed()
      .setColor(client.config.colors.GREEN)
      .setTitle('Success')
      .setDescription(`Successfully deleted ${count} messages.`);
    const successMsg = await message.channel.send({ embeds: [successEmbed] });
    setTimeout(() => successMsg.delete(), 7000);
  }
}