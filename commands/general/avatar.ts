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

    const avatarUrl = user.displayAvatarURL().slice(0, -4).concat('png?size=1024');

    const embed = new MessageEmbed()
      .setAuthor({ name: user.tag, iconURL: avatarUrl })
      .setImage(avatarUrl);
    message.channel.send({ embeds: [embed] });
  }
}

export default Avatar;