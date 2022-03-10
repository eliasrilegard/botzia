import { getColorFromURL } from 'color-thief-node';
import { Message, MessageEmbed } from 'discord.js';
import Command from '../../bot/command';

class Avatar extends Command {
  public constructor() {
    super(
      'avatar',
      'Gets the tagged user\'s avatar',
      ['[user]'],
      { guildOnly: true }
    );
  }

  public async execute(message: Message): Promise<void> {
    const user = message.mentions.users.first();
    if (!user) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('User not found')
        .setDescription('Could not fetch information for the specified user.')
        .addField('Tip', 'Make sure the user is tagged and is a member of this server.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    const avatarUrl = user.displayAvatarURL();
    const requestUrl = avatarUrl.endsWith('.webp') ? avatarUrl.slice(0, -4).concat('png').concat('?size=1024') : avatarUrl;
    const dominantColor = await getColorFromURL(requestUrl, 1);

    const embed = new MessageEmbed()
      .setColor(dominantColor)
      .setDescription(`Dominant color: #${this.hexify(dominantColor)}`)
      .setAuthor({ name: user.tag, iconURL: avatarUrl })
      .setImage(requestUrl);
    message.channel.send({ embeds: [embed] });
  }

  private hexify(rgb: Array<number>): string {
    return rgb.reduce((result, val) => result + val.toString(16).padStart(2, '0'), '');
  }
}

export default Avatar;