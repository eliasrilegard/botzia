import { BaseGuildTextChannel, Message, MessageEmbed } from 'discord.js';
import Command from '../../bot/command';

class Purge extends Command {
  public constructor() {
    super('purge', 'Clears a specified number of messages.', '[# of messages to purge]', { permissions: 'MANAGE_MESSAGES', guildOnly: true });
  }

  public async execute(message: Message, args: Array<string>): Promise<void> {
    const count = parseInt(args[0]) + 1;

    if (count < 2 || count > 100 || isNaN(count)) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Invalid argument')
        .setDescription('Specify a number between 1 and 100.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    try { await (message.channel as BaseGuildTextChannel).bulkDelete(count) }
    catch (error) {
      console.log(error); // TODO Replace with logger
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Error')
        .setDescription('An error was encountered while trying to delete messages.')
        .addField('Error message', error);
      message.channel.send({ embeds: [embed] });
      return;
    }
    const successEmbed = new MessageEmbed()
      .setColor('#00cc00')
      .setTitle('Success')
      .setDescription(`Successfully deleted ${count} messages.`);
    const successMsg = await message.channel.send({ embeds: [successEmbed] });
    setTimeout(() => successMsg.delete(), 7000);
  }
}

export default Purge;