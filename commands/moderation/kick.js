const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class Kick extends Command {
  constructor() {
    super('kick', 'Kick a member', '[member] [optional reason]', { guildOnly: true, permissions: 'KICK_MEMBERS' });
  }

  async execute(message, args) {
    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    if (!member.kickable) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Cannot kick member')
        .setDescription(`<@${member.user.id}> cannot be kicked.`)
      return message.channel.send({ embeds: [embed] });
    }

    member.kick(reason);
    const embed = new MessageEmbed()
      .setColor('00cc00')
      .setTitle('Success')
      .setDescription(`Successfully kicked <@${member.user.id}>${reason.length > 0 ? `for ${reason}` : ''}.`);
    message.channel.send({ embeds: [embed] });
  }
}

module.exports = Kick;