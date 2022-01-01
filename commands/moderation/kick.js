const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class Kick extends Command {
  constructor() {
    super('kick', 'Kick a member', '[member] [optional reason]', { guildOnly: true, permissions: 'KICK_MEMBERS' });
  }

  async execute(message, args, client) {
    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    const embed = new MessageEmbed().setColor('cc0000');

    if (!member) {
      embed
        .setTitle('No user targeted')
        .addField('Command usage', this.howTo(client.prefix(), true));
      return message.channel.send({ embeds: [embed] });
    }
    if (member.id == message.author.id) {
      embed
        .setTitle('You can\'t kick yourself')
        .setFooter({ text: 'Just leave 4Head' });
      return message.channel.send({ embeds: [embed] });
    }
    if (member.id == client.user.id) {
      embed.setTitle('I can\'t kick myself');
      return message.channel.send({ embeds: [embed] });
    }
    if (client.isDev(member.id)) {
      embed
        .setTitle('You may not kick my dev')
        .setFooter({ text: 'Don\'t even think about it >:c' });
      return message.channel.send({ embeds: [embed] });
    }
    if (this.permHierarchy(member, message.member) && !message.member.permissions.has('ADMINISTRATOR')) {
      embed
        .setTitle('Can\'t kick member')
        .setDescription('You can\'t kick someone equal to or above you');
      return message.channel.send({ embeds: [embed] });
    }
    if (this.permHierarchy(member, message.guild.members.resolve(client.user))) {
      embed
        .setTitle('Can\'t kick member')
        .setDescription('Specified user is above my highest role.');
      return message.channel.send({ embeds: [embed] });
    }
    if (!member.kickable) { // Failsafe
      embed
        .setTitle('Can\'t kick member')
        .setDescription(`<@${member.user.id}> cannot be kicked.`);
      return message.channel.send({ embeds: [embed] });
    }

    member.kick({ reason: reason });

    embed
      .setColor('00cc00')
      .setTitle('Success')
      .setDescription(`Successfully kicked <@${member.user.id}>${reason.length > 0 ? `for ${reason}` : ''}.`);
    message.channel.send({ embeds: [embed] });
  }

  permHierarchy(memberHigh, memberLow) {
    // Returns true if memberHigh is higher or equal to memberLow in the role hierarchy
    return memberLow.roles.highest.comparePositionTo(memberHigh.roles.highest) < 1;
  }
}

module.exports = Kick;