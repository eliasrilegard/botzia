import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class List extends Command {
  constructor(client: Bot) {
    super(
      client,
      'list',
      'List all monsters in Monster Hunter World & Iceborne',
      [],
      { args: false, belongsTo: 'mhw' }
    );
  }

  async execute(message: Message<boolean>): Promise<void> {
    if (this.client.mhwClient.monsters == null) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Monster data unavalible')
        .setDescription('Could not access monster data at this time.')
        .setFooter({ text: `If this issue persists please contact ${this.client.config.users.chrono_tag}` });
      message.channel.send({ embeds: [embed] });
      return;
    }

    const monsterNames = [...this.client.mhwClient.monsters.values()].map(monster => monster.title).sort((a, b) => a.localeCompare(b));
    const monstersPerPage = 20;

    const embeds = monsterNames
      .reduce((result: Array<Array<string>>, name, index) => { // Split monsterNames into chunks
        const chunkIndex = Math.floor(index / monstersPerPage);
        if (!result[chunkIndex]) result[chunkIndex] = [];
        result[chunkIndex].push(name);
        return result;
      }, [])
      .map(chunk => { // Map each chunk to an embed message
        return new EmbedBuilder()
          .setColor('#8fde5d')
          .addFields({ name: 'Monsters list', value: chunk.join('\n') });
      });
      
    this.sendMenu(message, embeds);
  }
}