import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class List extends Command {
  public constructor() {
    super('list', 'List all monsters in Monster Hunter World & Iceborne', '', { args: false, belongsTo: 'mhw' });
  }

  public async execute(message: Message<boolean>, args: string[], client: Bot): Promise<void> {
    if (client.mhwMonsters == null) {
      message.channel.send('data unavalible'); // TODO Make this prettier
      return;
    }

    const monsterNames = [...client.mhwMonsters.values()].map(monster => monster.title).sort((a, b) => a.localeCompare(b));
    const monstersPerPage = 20;
    const embeds = new Array<MessageEmbed>();

    const makePage = (names: Array<string>) => {
      if (!names.length) return;
      const page = new MessageEmbed()
        .setColor('#8fde5d')
        .addField('Monsters list', names.join('\n'));

      embeds.push(page);
    };

    let data = new Array<string>();
    for (let i = 0; i < monsterNames.length; i++) {
      if (i % monstersPerPage === 0) {
        makePage(data);
        data = new Array();
      }
      data.push(monsterNames[i]);
    }

    if (data.length) makePage(data);

    this.sendMenu(message, embeds);
  }
}

export default List;