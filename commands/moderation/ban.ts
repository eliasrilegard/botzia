import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';
import UtilityFunctions from '../../utils/utilities';

export default class Ban extends Command {
  constructor() {
    super(
      'ban',
      'Ban a member',
      ['[@member] (reason)'],
      { guildOnly: true, permissions: 'BAN_MEMBERS' }
    );
  }

  async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    const embed = new MessageEmbed().setColor(client.config.colors.RED);

    if (!member) {
      embed
        .setTitle('No user targeted')
        .addField('Command usage', this.howTo(await client.prefix(message), true));
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (member.id === message.author.id) {
      embed
        .setTitle('You can\'t ban yourself')
        .setFooter({ text: 'Just leave 4Head' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (member.id === client.user.id) {
      embed.setTitle('I can\'t ban myself');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (client.isDev(member.id)) {
      embed
        .setTitle('Using my own weapons against me...')
        .setFooter({ text: 'No, I don\'t think that\'ll work' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (UtilityFunctions.permHierarchy(member, message.member) && !message.member.permissions.has('ADMINISTRATOR')) {
      embed
        .setTitle('Can\'t ban member')
        .setDescription('You can\'t ban someone equal to or above you');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (UtilityFunctions.permHierarchy(member, message.guild.members.resolve(client.user))) {
      embed
        .setTitle('Can\'t ban member')
        .setDescription('Specified user is above my highest role.');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (!member.bannable) { // Failsafe
      embed
        .setTitle('Can\'t ban member')
        .setDescription(`<@${member.user.id}> cannot be banned.`);
      message.channel.send({ embeds: [embed] });
      return;
    }

    member.ban({ reason: reason });

    embed
      .setColor(client.config.colors.GREEN)
      .setTitle('Success')
      .setDescription(`Successfully banned <@${member.user.id}>${reason.length > 0 ? `for ${reason}` : ''}.`);
    message.channel.send({ embeds: [embed] });
  }
}