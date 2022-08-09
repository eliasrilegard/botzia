import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class Remindme extends Command {
  constructor(client: Bot) {
    super(
      client,
      'remindme',
      'Remind you of a message after a given time!',
      ['[time until reminder] (message)']
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    // Go through all args. If argument is a pure number, grab the next arg to
    // resolve unit and fast forward the index by one.
    // If the arg matches [digit][unit], figure out time from that.
    // When no more time arguments are found, concatenate the rest of the
    // arguments to form the reminder message.

    const time = { days: 0, hours: 0, minutes: 0 };

    let i: number;
    for (i = 0; i < args.length; i++) {
      const arg = args[i];

      let unitKey: string, amount: string;

      // If pure number
      if (/^\d+$/.test(arg)) {
        // Grab and test the next argument to resolve unit
        unitKey = args[i + 1];
        amount = arg;
        if (!/^(d|day|h|hour|m|min|minute)s?$/.test(unitKey)) { // Error, abort
          const embed = this.helpMessage(await this.client.prefix(message));
          message.channel.send({ embeds: [embed] });
          return;
        }
        i++;
      }

      // If 10d, 2mins, etc
      else if (/^\d+(d|day|h|hour|m|min|minute)s?$/.test(arg)) {
        amount = arg.match(/\d+/)[0];
        unitKey = arg[amount.length];
      }

      // Done with time arguments, rest of args is reminder message
      else break;
      
      const autocomplete = (val: string, obj: { [key: string]: number }) => 
        Object.keys(obj).join(' ').match(new RegExp(`${val}\\S*(?=\s)?`))[0];

      const unit = autocomplete(unitKey, time);
      time[unit] += parseInt(amount);
    }

    const msg = args.slice(i).join(' ');
    const duration = (time.days * 24 * 60 + time.hours * 60 + time.minutes) * 60000;

    if (duration <= 0) {
      const embed = this.helpMessage(await this.client.prefix(message));
      message.channel.send({ embeds: [embed] });
    }
    if (duration > 2073600000) { // Limit of setTimeout
      const embed = this.tooLong();
      message.channel.send({ embeds: [embed] });
    }

    const UIArray: Array<string> = [];
    for (const key in time) {
      const data: number = time[key];
      if (data > 0) UIArray.push(`${data} ${data === 1 ? key.slice(0, -1) : key}`);
    }
    const UIString = UIArray.join(', ').replace(/,(?=[^,]*)/, ' and'); // Replace last ',' with ' and'

    const embed = new MessageEmbed()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Reminder created')
      .setDescription(`Got it, I will remind you in ${UIString}.`)
      .setTimestamp(Date.now() + duration);
    if (msg) embed.addField('Message:', msg);
    message.channel.send({ embeds: [embed] });

    delete embed.description;
    delete embed.fields;

    embed
      .setTitle('Ding, here\'s your reminder!')
      .setTimestamp(Date.now());
    if (msg) embed.setDescription(msg);

    const pingList: Array<string> = [];
    if (message.mentions.members.size && msg) message.mentions.members.forEach(member => pingList.push(`${member}`));

    const sendReply = pingList.length ?
      () => message.reply({ content: pingList.join(' '), embeds: [embed] }) :
      () => message.reply({ embeds: [embed] });
    setTimeout(sendReply, duration);
  }

  private helpMessage(prefix: string): MessageEmbed {
    return new MessageEmbed()
      .setColor(this.client.config.colors.RED)
      .setTitle('Invalid time')
      .setDescription('Maybe check your arguments?')
      .addField('Arguments', '**Days:\nHours:\nMinutes:**', true)
      .addField('\u200b', 'd, day(s)\nh, hour(s)\nm, min(s), minute(s)', true)
      .addField('Command usage', this.howTo(prefix, true));
  }

  private tooLong(): MessageEmbed {
    return new MessageEmbed()
      .setColor(this.client.config.colors.RED)
      .setTitle('Invalid time')
      .setDescription('Reminders have an upper time limit of 24 days.');
  }
}