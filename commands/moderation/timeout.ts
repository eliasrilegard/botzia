import { GuildMember, Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Timeout extends Command {
  public constructor() {
    super('timeout', 'Give a user a timeout', '[user] [duration]; [optional reason] OR [user] [remove]', { permissions: 'MODERATE_MEMBERS' });
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const member = message.mentions.members.first();

    const prefix = await client.prefix(message);
    const embed = new MessageEmbed().setColor('#cc0000');

    if (!member) {
      embed
        .setTitle('No user targeted')
        .addField('Command usage', this.howTo(prefix, true));
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (member.id == message.author.id) {
      embed
        .setTitle('You can\'t timeout yourself')
        .setDescription('Ask someone else to do it if you really want');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (member.id == client.user.id) {
      embed
        .setTitle('I can\'t timeout myself')
        .setFooter({ text: 'How dare you' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (client.isDev(member.id)) {
      embed
        .setTitle('You may not timeout my dev')
        .setFooter({ text: 'Let\'s not do that shall we c:' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (this.permHierarchy(member, message.member) && !message.member.permissions.has('ADMINISTRATOR')) {
      embed
        .setTitle('Can\'t timeout member')
        .setDescription('You can\'t timeout someone equal to or above you');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (this.permHierarchy(member, message.guild.members.resolve(client.user))) {
      embed
        .setTitle('Can\'t timeout member')
        .setDescription('Specified user is above my highest role.');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (!member.moderatable) { // Failsafe
      embed
        .setTitle('Can\'t timeout member')
        .setDescription(`<@${member.user.id}> cannot be timed out.`);
      message.channel.send({ embeds: [embed] });
      return;
    }

    if (member.communicationDisabledUntilTimestamp > Date.now()) { // Workaround for isCommunicationDisabled()
      if (args[1] == 'remove') {
        embed
          .setColor('#00cc00')
          .setTitle('Timeout removal successful')
          .setDescription(`Successfully removed timeout for <@${member.user.id}>.`);
        member.disableCommunicationUntil(null);
        message.channel.send({ embeds: [embed] });
        return;
      }
      embed.setTitle('User is already timed out');
      message.channel.send({ embeds: [embed] });
      return;
    }

    const reasonStart = args.indexOf(args.filter(arg => arg.includes(';'))[0]) + 1; // -1 + 1 if no match
    const reasonMessage = reasonStart ? args.slice(reasonStart, args.length).join(' ') : '';
    const timeArgs = reasonStart ? [...args.slice(1, reasonStart - 1), args[reasonStart - 1].slice(0, -1)] : args.slice(1);

    const timeData = [0, 0, 0, 0];
    const acceptedWords = ['day', 'hour', 'min', 'sec'];

    timeArgs.forEach((arg, i) => {
      if (arg.match(/^\d+[dhms]$/i)) {
        const index = Number(arg.slice(-1).toLowerCase() == 'h') + Number(arg.slice(-1).toLowerCase() == 'm') * 2 + Number(arg.slice(-1).toLowerCase() == 's') * 3;
        timeData[index] = Math.abs(parseInt(arg.slice(0, -1)));
      }
      else if (acceptedWords.some(word => arg.toLowerCase().startsWith(word)) && args[i - 1].match(/^\d+$/)) {
        const index = Number(arg.slice(0, 1).toLowerCase() == 'h') + Number(arg.slice(0, 1).toLowerCase() == 'm') * 2 + Number(arg.slice(0, 1).toLowerCase() == 's') * 3;
        timeData[index] = Math.abs(parseInt(timeArgs[i - 1]));
      }
    });
    
    const time = (timeData[0] * 24 * 60 * 60 + timeData[1] * 60 * 60 + timeData[2] * 60 + timeData[3]) * 1000;
    
    if (time < 0) {
      message.channel.send({ embeds: [this.helpMessage(prefix)] });
      return;
    }

    member.disableCommunicationUntil(Date.now() + time, reasonMessage);

    const UIWords = ['days', 'hours', 'minutes', 'seconds'];
    const UIArray = new Array();
    timeData.forEach((data, i) => {
      if (data) UIArray.push(`${data} ${data == 1 ? UIWords[i].slice(0, -1) : UIWords[i]}`);
    });
    const UIString = UIArray.join(', ').replace(/,([^,]*)$/, ' and$1');

    embed
      .setColor('#00cc00')
      .setTitle('Timeout successful')
      .setDescription(`Successfully timed out <@${member.user.id}> for ${UIString}.`);

    if (reasonMessage.length) embed.addField('Reason', reasonMessage);
    message.channel.send({ embeds: [embed] });
  }

  private permHierarchy(memberHigh: GuildMember, memberLow: GuildMember): boolean {
    return memberLow.roles.highest.comparePositionTo(memberHigh.roles.highest) < 1;
  }

  private helpMessage(prefix: string): MessageEmbed {
    return new MessageEmbed()
      .setColor('#cc0000')
      .setTitle('Invalid time')
      .setDescription('Maybe check your arguments?')
      .addField('Arguments', '**Days:\nHours:\nMinutes:\nSeconds:**', true)
      .addField('\u200b', 'd, day(s)\nh, hour(s)\nm, min(s), minute(s)\ns, sec, second(s)', true)
      .addField('Command usage', this.howTo(prefix, true));
  }
}

export default Timeout;