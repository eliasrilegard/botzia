import { getColorFromURL } from 'color-thief-node';
import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Avatar extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'avatar',
      'Gets the tagged user\'s avatar',
      ['[user]'],
      { guildOnly: true }
    );
  }

  async execute(message: Message): Promise<void> {
    const user = message.mentions.users.first();
    if (!user) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('User not found')
        .setDescription('Could not fetch information for the specified user.')
        .addFields({ name: 'Tip', value: 'Make sure the user is tagged and is a member of this server.' });
      message.channel.send({ embeds: [embed] });
      return;
    }

    const avatarUrl = user.displayAvatarURL();
    const requestUrl = avatarUrl.endsWith('.webp') ? avatarUrl.slice(0, -4).concat('png').concat('?size=1024') : avatarUrl;
    const dominantColor = await getColorFromURL(requestUrl, 1);

    const embed = new EmbedBuilder()
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