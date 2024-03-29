import { ChatInputCommandInteraction, EmbedBuilder, Message, SlashCommandBuilder, Snowflake, TextChannel } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class RemindMe extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('remindme')
      .setDescription('Remind you of something after a given time')
      .addStringOption(option => option
        .setName('timer')
        .setDescription('How long until the reminder triggers: 2d, 15mins, 1 hour, etc')
        .setRequired(true)
      )
      .addStringOption(option => option
        .setName('message')
        .setDescription('Any message you want to be reminded of')
      );
    super(data as SlashCommandBuilder, client);

    if (client) { // Client is undefined on command registration
      setTimeout(() => this.updateJobs(), 1_000); // Hack to let the database fully load before we query
      // Load jobs on object creation, then refresh jobs every two weeks
      setInterval(() => this.updateJobs(), 1_209_600_000);
    }
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Go through all timer args. If argument is a pure number, grab the
    // next arg to resolve unit and fast forward the index by one.
    // If the arg matches [digit][unit], figure out time from that.
    // When no more time arguments are found, concatenate the rest of the
    // arguments to form the reminder message.

    const timerArgs = interaction.options.getString('timer')!.split(/\s+/);

    const time: { [key: string]: number } = { days: 0, hours: 0, minutes: 0 };

    for (let i = 0; i < timerArgs.length; i++) {
      const arg = timerArgs[i].toLowerCase();

      let unitKey: string, amount: string;

      // If pure number
      if (/^\d+$/.test(arg)) {
        // Grab and test the next argument to resolve unit
        unitKey = timerArgs[i + 1].toLowerCase();
        amount = arg;
        if (!/^(d|day|h|hour|m|min|minute)s?$/.test(unitKey)) { // Error, abort
          const embed = this.helpMessage();
          interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }
        i++;
      }

      // If 10d, 2mins, etc
      else if (/^\d+(d|day|h|hour|m|min|minute)s?$/.test(arg)) {
        amount = arg.match(/\d+/)![0];
        unitKey = arg[amount.length];
      }

      /*
       * If nothing matches, the argument is invalid.
       *
       * In the text version of this command, this else statement just breaks
       * the loop and tells us that this is where the message begins.
       * However since we're using slash commands we get the message by another
       * method, and thus if we land here we know that this argument cannot
       * be interpreted as any sort of time, so we just "throw" an error instead.
       */
      else {
        const embed = this.helpMessage();
        interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      const autocomplete = (val: string, obj: { [key: string]: number }) => 
        Object.keys(obj).join(' ').match(new RegExp(`${val}\\S*(?=\s)?`))![0];

      const unit = autocomplete(unitKey, time);
      time[unit] += parseInt(amount);
    }

    const duration = (time.days * 24 * 60 + time.hours * 60 + time.minutes) * 60000;
    if (duration <= 0) {
      const embed = this.helpMessage();
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const message = interaction.options.getString('message');

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
    if (message) embed.addFields({ name: 'Message:', value: message });
    const okMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

    const pingList: Array<Snowflake> = [interaction.user.id];
    if (message) {
      // A ! means they have a nickname
      message.match(/<@!?\d{18,19}>/g)?.forEach(ping => pingList.push(ping.match(/\d{18,19}/)![0]));
    }

    const now = Date.now();
    this.client.database.setReminderJob(`${now + duration}`, interaction.channelId, okMessage.id, pingList, message ?? undefined);

    delete embed.data.description;
    delete embed.data.fields;
    delete embed.data.timestamp;
    
    embed.setTitle('Ding, here\'s your reminder!');
    if (message) embed.setDescription(message);
    
    if (duration < 1_209_600_000) { // If more than 14 days we just store in database
      setTimeout(() => {
        this.sendReply(okMessage, embed, pingList);
        this.client.database.removeReminderJob(`${now + duration}`);
      }, duration);
    }
  }

  private helpMessage(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.client.config.colors.RED)
      .setTitle('Invalid time')
      .setDescription('Maybe check your arguments?')
      .addFields([
        { name: 'Arguments', value: '**Days:\nHours:\nMinutes:**', inline: true },
        { name: '\u200b', value: 'd, day(s)\nh, hour(s)\nm, min(s), minute(s)', inline: true }
      ]);
  }

  private sendReply(message: Message, embed: EmbedBuilder, pingList: Array<Snowflake>): void {
    message.reply({ embeds: [embed], content: `<@${pingList.join('> <@')}>` });
  }

  private async updateJobs(): Promise<void> {
    const allJobs = this.client.database.getAllReminderJobs();
    for (const job of allJobs) {
      const remainingTime = parseInt(job.dueTime) - Date.now(); // ms
      if (remainingTime < 1_209_600_000) {
        if (remainingTime < 0) {
          this.client.database.removeReminderJob(job.dueTime);
          continue;
        }
        
        const channel = await this.client.channels.fetch(job.channelId) as TextChannel;
        const replyToMessage = await channel.messages.fetch(job.messageId);

        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.GREEN)
          .setTitle('Ding, here\'s your reminder!')
          .setTimestamp(replyToMessage.createdTimestamp);
        if (job.message) embed.setDescription(job.message);

        setTimeout(() => {
          this.sendReply(replyToMessage, embed, job.userIds);
          this.client.database.removeReminderJob(job.dueTime);
        }, remainingTime);
      }
    }
  }
}