import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class Restart extends Command {
  constructor() {
    super(
      'restart',
      'Restarts the bot',
      [''],
      { args: false, devOnly: true }
    );
  }

  async execute(message: Message, _args: Array<string>, client: Bot): Promise<void> {
    const embed = new MessageEmbed()
      .setColor(client.config.colors.BLUE)
      .setTitle('Restarting')
      .setDescription('Sent request to respawn all shards.')
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
    client.shard.respawnAll();
  }
}