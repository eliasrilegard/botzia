import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';
import Utils from '../../bot/utils';

import * as monsterData from '../../database/monster_hunter/monster_data/mhw_monster_data.json';

interface IMonsterInfo {
  name: string;
  details: IMonsterDetails;
}

interface IMonsterDetails {
  aliases: Array<string>;
  title: string;
  url: string;
  description: string;
  thumbnail: string;
  elements: Array<string>;
  ailments: Array<string>;
  locations: Array<{
    name: string;
    color: string;
  }>;
  info: string;
  hzv: {
    slash: string;
    blunt: string;
    shot: string;
    fire: string;
    water: string;
    thunder: string;
    ice: string;
    dragon: string;
  };
  species: string;
  useful_info: string;
  resistances: Array<string>;
  weakness: Array<string>;
  hzv_name: string;
  hzv_filepath: string;
  icon_name: string;
  icon_filepath: string;
  threat_level: string;
}

class Hzv extends Command {
  private monsters: Map<string, IMonsterDetails>;

  public constructor() {
    super('hzv', 'Gets the HZV of a specified monster [WIP]', '[monster name]', { belongsTo: 'mhw' });
    this.monsters = new Map();
    for (const [, v] of Utils.getDataAsMap(monsterData) as Map<string, IMonsterInfo>) this.monsters.set(v.name, v.details);
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    let input = args.join('').toLowerCase();

    if (this.monsters == null) {
      message.channel.send('data unavalible');
      return;
    }

    for (const [name, monster] of this.monsters.entries()) {
      if (monster.aliases && monster.aliases.includes(input) && input.length > 0) {
        input = name;
        break;
      }
    }

    if (this.monsters.has(input)) {
      const [embed, imageStream] = await this.monsterEmbed(input);
      message.channel.send({ embeds: [embed], files: [...imageStream] });
    }
    else if (!this.monsters.has(input)) {
      const msg = `That monster doesn't seem to exist! Check out \`${await client.prefix(message)}mhw list\` for the full list.`;
      message.channel.send(msg);
    }
  }

  private async monsterEmbed(name: string): Promise<[MessageEmbed, Array<string>]> {
    const monster = this.monsters.get(name);

    const title = `__**${monster.title}**__${monster.threat_level ? `  ${monster.threat_level}` : ''}`;

    const attachURL = (fileName: string) => `attachment://${fileName}`;

    const embed = new MessageEmbed()
      .setColor('#8fde5d')
      .setTitle(title)
      .setThumbnail(attachURL(monster.icon_name))
      .setImage(attachURL(monster.hzv_name))
      .addField('Classification', monster.species)
      .addField('Characteristics', monster.description)
      .addField(
        `Slash: **${monster.hzv.slash}** Blunt: **${monster.hzv.blunt}** Shot: **${monster.hzv.shot}**`,
        `🔥 **${monster.hzv.fire}** 💧 **${monster.hzv.water}** ⚡ **${monster.hzv.thunder}** ❄ **${monster.hzv.ice}** 🐉 **${monster.hzv.dragon}**`
      )
      .setTimestamp()
      .setFooter({ text: monster.title });

    return [embed, [monster.icon_filepath, monster.hzv_filepath]];
  }
}

export default Hzv;