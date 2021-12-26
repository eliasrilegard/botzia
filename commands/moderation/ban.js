const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class Ban extends Command {
  constructor() {
    super('ban', 'Ban a member', '[member] [optional reason]', { guildOnly: true, permissions: 'BAN_MEMBERS' });
  }

  async execute(message, args) {
    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    if (!member.bannable) {
      const embed = new MessageEmbed()
        .setColor('cc0000')
        .setTitle('Cannot ban member')
        .setDescription(`<@${member.user.id}> cannot be banned.`)
      return message.channel.send({ embeds: [embed] });
    }

    member.ban(reason);
    const embed = new MessageEmbed()
      .setColor('00cc00')
      .setTitle('Success')
      .setDescription(`Successfully banned <@${member.user.id}>${reason.length > 0 ? `for ${reason}` : ''}.`);
    message.channel.send({ embeds: [embed] });
  }
}

module.exports = Ban;