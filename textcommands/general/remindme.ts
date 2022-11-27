import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Remindme extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'remindme',
      'Remind you of a message after a given time!',
      ['[time until reminder] (message)']
    );

    // this.updateJobs(); // Load jobs on object creation, then refresh jobs every two weeks
    // setInterval(() => this.updateJobs(), 1_209_600_000);
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    // Go through all args. If argument is a pure number, grab the next arg to
    // resolve unit and fast forward the index by one.
    // If the arg matches [digit][unit], figure out time from that.
    // When no more time arguments are found, concatenate the rest of the
    // arguments to form the reminder message.

    const time: { [key: string]: number } = { days: 0, hours: 0, minutes: 0 };

    let i: number;
    for (i = 0; i < args.length; i++) {
      const arg = args[i].toLowerCase();

      let unitKey: string, amount: string;

      // If pure number
      if (/^\d+$/.test(arg)) {
        // Grab and test the next argument to resolve unit
        unitKey = args[i + 1].toLowerCase();
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
        amount = arg.match(/\d+/)![0];
        unitKey = arg[amount.length];
      }

      // Done with time arguments, rest of args is reminder message
      else break;
      
      const autocomplete = (val: string, obj: { [key: string]: number }) => 
        Object.keys(obj).join(' ').match(new RegExp(`${val}\\S*(?=\s)?`))![0];

      const unit = autocomplete(unitKey, time);
      time[unit] += parseInt(amount);
    }

    const msg = args.slice(i).join(' ');
    const duration = (time.days * 24 * 60 + time.hours * 60 + time.minutes) * 60000;

    if (duration <= 0) {
      const embed = this.helpMessage(await this.client.prefix(message));
      message.channel.send({ embeds: [embed] });
      return;
    }

    const UIArray: Array<string> = [];
    for (const key in time) {
      const data: number = time[key];
      if (data > 0) UIArray.push(`${data} ${data === 1 ? key.slice(0, -1) : key}`);
    }
    const UIString = UIArray.join(', ').replace(/,(?=[^,]*)/, ' and'); // Replace last ',' with ' and'

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Reminder created')
      .setDescription(`Got it, I will remind you in ${UIString}.`)
      .setTimestamp(Date.now() + duration);
    if (msg) embed.addFields({ name: 'Message:', value: msg });
    message.channel.send({ embeds: [embed] });

    const pingList: Array<string> = [message.author.id];
    if (message.mentions.members?.size && msg) message.mentions.members.forEach(member => pingList.push(member.id));

    const now = Date.now();
    this.client.database.setReminderJob(`${now + duration}`, message.channelId, message.id, pingList, msg);

    delete embed.data.description;
    delete embed.data.fields;
    
    embed
      .setTitle('Ding, here\'s your reminder!')
      .setTimestamp(Date.now());
    if (msg) embed.setDescription(msg);
    
    if (duration < 1_209_600_000) { // If more than 14 days we just store in database
      setTimeout(() => {
        this.sendReply(message, embed, pingList);
        this.client.database.removeReminderJob(`${now + duration}`);
      }, duration);
    }
  }

  private sendReply(message: Message, embed: EmbedBuilder, pingList: Array<string>): void {
    message.reply({ embeds: [embed], content: `<@${pingList.join('> <@')}>` });
  }

  // private async updateJobs(): Promise<void> {
  //   const allJobs = this.client.database.getAllReminderJobs();
  //   for (const job of allJobs) {
  //     const remainingTime = parseInt(job.dueTime) - Date.now(); // ms
  //     if (remainingTime < 1_209_600_000) {
  //       if (remainingTime < 0) {
  //         this.client.database.removeReminderJob(job.dueTime);
  //         continue;
  //       }
        
  //       const channel = await this.client.channels.fetch(job.channelId) as TextChannel;
  //       const replyToMessage = await channel.messages.fetch(job.messageId);

  //       const embed = new EmbedBuilder()
  //         .setColor(this.client.config.colors.GREEN)
  //         .setTitle('Ding, here\'s your reminder!')
  //         .setTimestamp(replyToMessage.createdTimestamp);
  //       if (job.message) embed.setDescription(job.message);

  //       const pingList: Array<string> = [];
  //       if (replyToMessage.mentions.members?.size && job.message) replyToMessage.mentions.members.forEach(member => pingList.push(`${member}`));

  //       setTimeout(() => {
  //         this.sendReply(replyToMessage, embed, pingList);
  //         this.client.database.removeReminderJob(job.dueTime);
  //       }, remainingTime);
  //     }
  //   }
  // }

  private helpMessage(prefix: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.client.config.colors.RED)
      .setTitle('Invalid time')
      .setDescription('Maybe check your arguments?')
      .addFields([
        { name: 'Arguments', value: '**Days:\nHours:\nMinutes:**', inline: true },
        { name: '\u200b', value: 'd, day(s)\nh, hour(s)\nm, min(s), minute(s)', inline: true },
        { name: 'Command usage', value: this.howTo(prefix, true) }
      ]);
  }
}