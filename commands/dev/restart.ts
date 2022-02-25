import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Restart extends Command {
  public constructor() {
    super(
      'restart',
      'Restarts the bot',
      [''],
      { args: false, devOnly: true }
    );
  }

  public async execute(message: Message, _args: Array<string>, client: Bot): Promise<void> {
    const embed = new MessageEmbed()
      .setColor('#0066cc')
      .setTitle('Restarting')
      .setDescription('Sent request to respawn all shards.')
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
    client.shard.respawnAll();
  }
}

export default Restart;