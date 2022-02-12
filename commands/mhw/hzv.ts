import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';
import Utils from '../../bot/utils';

import * as monsterData from '../../database/monster_hunter/monster_data/mhw_monster_data.json';

interface MonsterInfo {
  name: string;
  details: MonsterDetails;
}

interface HzvSummary {
  slash: string;
  blunt: string;
  shot: string;
  fire: string;
  water: string;
  thunder: string;
  ice: string;
  dragon: string;
}

interface MonsterDetails {
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
    icon?: string;
    tempered?: boolean;
  }>;
  info: string;
  hzv: HzvSummary;
  hzv_hr?: HzvSummary;
  species: string;
  useful_info: string;
  resistances: Array<string>;
  weakness: Array<string>;
  hzv_filepath: string;
  hzv_filepath_hr?: string;
  icon_filepath: string;
  threat_level?: string;
}

class Hzv extends Command {
  private monsters: Map<string, MonsterDetails>;

  public constructor() {
    super('hzv', 'Gets the HZV of a specified monster [WIP]', '[monster name]', { belongsTo: 'mhw' });
    this.monsters = new Map();
    for (const [, v] of Utils.getDataAsMap(monsterData) as Map<string, MonsterInfo>) this.monsters.set(v.name, v.details);
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    let input = args.join('').toLowerCase();

    const isHR = input.startsWith('hr');
    if (isHR) input = input.slice(2);

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
      const monster = this.monsters.get(input);
      if (isHR && !('hzv_filepath_hr' in monster)) return this.notFound(message, client);

      const [embed, imageStream] = await this.monsterEmbed(monster, isHR);
      message.channel.send({ embeds: [embed], files: [...imageStream] });
    }
    else if (!this.monsters.has(input)) return this.notFound(message, client);
  }

  private async monsterEmbed(monster: MonsterDetails, isHR: boolean): Promise<[MessageEmbed, Array<string>]> {
    const hzvFilePath = isHR ? monster.hzv_filepath_hr : monster.hzv_filepath;
    const hzv = isHR ? monster.hzv_hr : monster.hzv;

    const hzvName = hzvFilePath.slice(hzvFilePath.lastIndexOf('/') + 1);
    const iconName = monster.icon_filepath.slice(monster.icon_filepath.lastIndexOf('/') + 1);

    const title = `__**${monster.title}**__${monster.threat_level ? `  ${monster.threat_level}` : ''}`;

    const attachURL = (fileName: string) => `attachment://${fileName}`;
    
    const embed = new MessageEmbed()
      .setColor('#8fde5d')
      .setTitle(title)
      .setThumbnail(attachURL(iconName))
      .setImage(attachURL(hzvName))
      .addField('Classification', monster.species)
      .addField('Characteristics', monster.description)
      .addField(
        `Slash: **${hzv.slash}** Blunt: **${hzv.blunt}** Shot: **${hzv.shot}**`,
        `🔥 **${hzv.fire}** 💧 **${hzv.water}** ⚡ **${hzv.thunder}** ❄ **${hzv.ice}** 🐉 **${hzv.dragon}**`
      );
    
    return [embed, [monster.icon_filepath, hzvFilePath]];
  }

  private async notFound(message: Message, client: Bot): Promise<void> {
    const embed = new MessageEmbed()
      .setColor('#cc0000')
      .setTitle('Monster not found')
      .setDescription(`That monster doesn't seem to exist!\nCheck out \`${await client.prefix(message)}mhw list\` for the full list.`);
    message.channel.send({ embeds: [embed] });
  }
}

export default Hzv;