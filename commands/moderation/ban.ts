import { GuildMember, Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Ban extends Command {
  public constructor() {
    super('ban', 'Ban a member', '[member] [optional reason]', { guildOnly: true, permissions: 'BAN_MEMBERS' });
  }

  public async execute(message: Message, args: string[], client: Bot): Promise<void> {
    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    const embed = new MessageEmbed().setColor('#cc0000');

    if (!member) {
      embed
        .setTitle('No user targeted')
        .addField('Command usage', this.howTo(await client.prefix(message), true));
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (member.id == message.author.id) {
      embed
        .setTitle('You can\'t ban yourself')
        .setFooter({ text: 'Just leave 4Head' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (member.id == client.user.id) {
      embed.setTitle('I can\'t ban myself');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (client.isDev(member.id)) {
      embed
        .setTitle('You may not ban my dev')
        .setFooter({ text: 'Don\'t even think about it >:c' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (this.permHierarchy(member, message.member) && !message.member.permissions.has('ADMINISTRATOR')) {
      embed
        .setTitle('Can\'t ban member')
        .setDescription('You can\'t ban someone equal to or above you');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (this.permHierarchy(member, message.guild.members.resolve(client.user))) {
      embed
        .setTitle('Can\'t ban member')
        .setDescription('Specified user is above my highest role.');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (!member.bannable) { // Failsafe
      embed
        .setTitle('Can\'t ban member')
        .setDescription(`<@${member.user.id}> cannot be kicked.`);
      message.channel.send({ embeds: [embed] });
      return;
    }

    member.ban({ reason: reason });

    embed
      .setColor('#00cc00')
      .setTitle('Success')
      .setDescription(`Successfully banned <@${member.user.id}>${reason.length > 0 ? `for ${reason}` : ''}.`);
    message.channel.send({ embeds: [embed] });
  }

  private permHierarchy(memberHigh: GuildMember, memberLow: GuildMember): boolean {
    // Returns true if memberHigh is higher or equal to memberLow in the role hierarchy
    return memberLow.roles.highest.comparePositionTo(memberHigh.roles.highest) < 1;
  }
}

export default Ban;