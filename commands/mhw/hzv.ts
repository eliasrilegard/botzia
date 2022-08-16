import { AttachmentBuilder, EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Hzv extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'hzv',
      'Gets the HZV of a specified monster',
      ['[monster name]'],
      { belongsTo: 'mhw' }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    let input = args.join('').toLowerCase();

    const isHR = input.startsWith('hr');
    if (isHR) input = input.slice(2);

    if (this.client.mhwClient.monsters == null) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Monster data unavalible')
        .setDescription('Could not access monster data at this time.')
        .setFooter({ text: `If this issue persists please contact ${this.client.config.users.chrono_tag}` });
      message.channel.send({ embeds: [embed] });
      return;
    }

    for (const [name, monster] of this.client.mhwClient.monsters.entries()) {
      if (monster.aliases && monster.aliases.includes(input) && input.length > 0) {
        input = name;
        break;
      }
    }

    if (this.client.mhwClient.monsters.has(input)) {
      const monster = this.client.mhwClient.monsters.get(input);
      if (isHR && !('hzv_filepath_hr' in monster)) return this.notFound(message);

      const [embed, imageStream] = await this.monsterEmbed(input, isHR);
      message.channel.send({ embeds: [embed], files: [...imageStream] });
    }
    else if (!this.client.mhwClient.monsters.has(input)) return this.notFound(message);
  }

  private async monsterEmbed(name: string, isHR: boolean): Promise<[EmbedBuilder, Array<AttachmentBuilder>]> {
    const monster = this.client.mhwClient.monsters.get(name);
    const hzvFilepath = isHR ? monster.hzv_filepath_hr : monster.hzv_filepath;
    const hzv = isHR ? monster.hzv_hr : monster.hzv;

    // Get file name by cutting off everything before and including the last '/'
    // Clean up file name by removing characters that will mess with Discord's API
    const thumbnail = new AttachmentBuilder(
      monster.icon_filepath,
      { name: monster.icon_filepath.slice(monster.icon_filepath.lastIndexOf('/') + 1).replace(/[',\s-]/g, '') }
    );
    const hzvImage = new AttachmentBuilder(
      hzvFilepath,
      { name: hzvFilepath.slice(hzvFilepath.lastIndexOf('/') + 1).replace(/[',\s-]/g, '') }
    );

    const title = `__**${monster.title}**__${monster.threat_level ? `  ${monster.threat_level}` : ''}`;

    const attachURL = (fileName: string) => `attachment://${fileName}`;
    
    const embed = new EmbedBuilder()
      .setColor('#8fde5d')
      .setTitle(title)
      .setThumbnail(attachURL(thumbnail.name))
      .setImage(attachURL(hzvImage.name))
      .addFields([
        { name: 'Classification', value: monster.species },
        { name: 'Characteristics', value: monster.description },
        {
          name: `Slash: **${hzv.slash}** Blunt: **${hzv.blunt}** Shot: **${hzv.shot}**`,
          value: `🔥 **${hzv.fire}** 💧 **${hzv.water}** ⚡ **${hzv.thunder}** ❄ **${hzv.ice}** 🐉 **${hzv.dragon}**`
        }
      ]);
    
    return [embed, [thumbnail, hzvImage]];
  }

  private async notFound(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.RED)
      .setTitle('Monster not found')
      .setDescription(`That monster doesn't seem to exist!\nCheck out \`${await this.client.prefix(message)}mhw list\` for the full list.`);
    message.channel.send({ embeds: [embed] });
  }
}