import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Hzv extends Command {
  public constructor() {
    super('hzv', 'Gets the HZV of a specified monster', '[monster name]', { belongsTo: 'mhw' });
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    let input = args.join('').toLowerCase();

    const isHR = input.startsWith('hr');
    if (isHR) input = input.slice(2);

    if (client.mhwMonsters == null) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Monster data unavalible')
        .setDescription('Could not access monster data at this time.')
        .setFooter({ text: `If this issue persists please contact ${client.config.users.chrono_tag}` });
      message.channel.send({ embeds: [embed] });
      return;
    }

    for (const [name, monster] of client.mhwMonsters.entries()) {
      if (monster.aliases && monster.aliases.includes(input) && input.length > 0) {
        input = name;
        break;
      }
    }

    if (client.mhwMonsters.has(input)) {
      const monster = client.mhwMonsters.get(input);
      if (isHR && !('hzv_filepath_hr' in monster)) return this.notFound(message, client);

      const [embed, imageStream] = await this.monsterEmbed(client, input, isHR);
      message.channel.send({ embeds: [embed], files: [...imageStream] });
    }
    else if (!client.mhwMonsters.has(input)) return this.notFound(message, client);
  }

  private async monsterEmbed(client: Bot, name: string, isHR: boolean): Promise<[MessageEmbed, Array<string>]> {
    const monster = client.mhwMonsters.get(name);
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