import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class List extends Command {
  public constructor() {
    super(
      'list',
      'List all monsters in Monster Hunter World & Iceborne',
      [],
      { args: false, belongsTo: 'mhw' }
    );
  }

  public async execute(message: Message<boolean>, _args: string[], client: Bot): Promise<void> {
    if (client.mhwMonsters == null) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Monster data unavalible')
        .setDescription('Could not access monster data at this time.')
        .setFooter({ text: `If this issue persists please contact ${client.config.users.chrono_tag}` });
      message.channel.send({ embeds: [embed] });
      return;
    }

    const monsterNames = [...client.mhwMonsters.values()].map(monster => monster.title).sort((a, b) => a.localeCompare(b));
    const monstersPerPage = 20;

    const embeds = monsterNames
      .reduce((result, name, index) => { // Split array into even chunks
        const chunkIndex = Math.floor(index / monstersPerPage);
        if (!result[chunkIndex]) result[chunkIndex] = new Array<string>();
        result[chunkIndex].push(name);
        return result;
      }, new Array<Array<string>>())
      .map((chunk: Array<string>) => { // Map each chunk to an embed message
        return new MessageEmbed()
          .setColor('#8fde5d')
          .addField('Monsters list', chunk.join('\n'));
      });

    this.sendMenu(message, embeds);
  }
}

export default List;