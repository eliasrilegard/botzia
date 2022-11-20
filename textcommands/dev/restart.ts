import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Restart extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'restart',
      'Restarts the bot',
      [''],
      { args: false, devOnly: true }
    );
  }

  async execute(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Restarting')
      .setDescription('Sent request to respawn all shards.')
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
    this.client.shard!.respawnAll();
  }
}