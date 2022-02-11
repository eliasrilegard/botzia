import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Hzv extends Command {
  public constructor() {
    super('hzv', 'Gets the HZV of a specified monster [WIP]', '[monster name]', { belongsTo: 'mhw' });
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const embed = new MessageEmbed()
      .setColor('#cc0000')
      .setTitle('Command not implemented (WIP)');
    message.channel.send({ embeds: [embed] });
  }
}

export default Hzv;