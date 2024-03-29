import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';
import UtilityFunctions from '../../utils/utilities';

export default class Timeout extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'timeout',
      'Give a user a timeout',
      ['[@member] [duration]; (reason)', '[@member] remove'],
      { permissions: 'MODERATE_MEMBERS' }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    const member = message.mentions.members?.first();

    const prefix = await this.client.prefix(message);
    const embed = new EmbedBuilder().setColor(this.client.config.colors.RED);

    if (!member) {
      embed
        .setTitle('No user targeted')
        .addFields({ name: 'Command usage', value: this.howTo(prefix, true) });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (member.id === message.author.id) {
      embed
        .setTitle('You can\'t timeout yourself')
        .setDescription('Ask someone else to do it if you really want');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (member.id === this.client.user!.id) {
      embed
        .setTitle('I can\'t timeout myself')
        .setFooter({ text: 'How dare you' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (this.client.isDev(member.id)) {
      embed
        .setTitle('You may not timeout my dev')
        .setFooter({ text: 'Let\'s not do that shall we c:' });
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (UtilityFunctions.permHierarchy(member, message.member!) && !message.member!.permissions.has('Administrator')) {
      embed
        .setTitle('Can\'t timeout member')
        .setDescription('You can\'t timeout someone equal to or above you');
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (UtilityFunctions.permHierarchy(member, message.guild!.members.resolve(message.guild!.members.me!))) {
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

    if (member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now()) { // Workaround for isCommunicationDisabled()
      if (args[1] === 'remove') {
        embed
          .setColor(this.client.config.colors.GREEN)
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
        const index = Number(arg.slice(-1).toLowerCase() === 'h') + Number(arg.slice(-1).toLowerCase() === 'm') * 2 + Number(arg.slice(-1).toLowerCase() === 's') * 3;
        timeData[index] = Math.abs(parseInt(arg.slice(0, -1)));
      }
      else if (acceptedWords.some(word => arg.toLowerCase().startsWith(word)) && args[i - 1].match(/^\d+$/)) {
        const index = Number(arg.slice(0, 1).toLowerCase() === 'h') + Number(arg.slice(0, 1).toLowerCase() === 'm') * 2 + Number(arg.slice(0, 1).toLowerCase() === 's') * 3;
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
    const UIArray: Array<string> = [];
    timeData.forEach((data, i) => {
      if (data) UIArray.push(`${data} ${data === 1 ? UIWords[i].slice(0, -1) : UIWords[i]}`);
    });
    const UIString = UIArray.join(', ').replace(/,([^,]*)$/, ' and$1');

    embed
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Timeout successful')
      .setDescription(`Successfully timed out <@${member.user.id}> for ${UIString}.`);

    if (reasonMessage.length) embed.addFields({ name: 'Reason', value: reasonMessage });
    message.channel.send({ embeds: [embed] });
  }

  private helpMessage(prefix: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.client.config.colors.RED)
      .setTitle('Invalid time')
      .setDescription('Maybe check your arguments?')
      .addFields([
        { name: 'Arguments', value: '**Days:\nHours:\nMinutes:\nSeconds:**', inline: true },
        { name: '\u200b', value: 'd, day(s)\nh, hour(s)\nm, min(s), minute(s)\ns, sec, second(s)', inline: true },
        { name: 'Command usage', value: this.howTo(prefix, true) }
      ]);
  }
}