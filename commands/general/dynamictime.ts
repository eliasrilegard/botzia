import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class DynamicTime extends Command {
  private readonly timezones: Map<string, number>;

  constructor(client: Bot) {
    super(
      client,
      'dynamictime',
      'Convert a timestamp (UTC) to dynamic date-time display',
      ['(YYYY-MM-DD) [HH:MM] (timezone or UTC±offset)', '--list', '--timezone [set or reset]'],
      { aliases: ['dtime'] }
    );

    this.timezones = new Map([
      ['UTC', 0],
      ['CET', 1],
      ['CEST', 2]
    ]);
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    // If timezone list requested
    if (args.length === 1 && args[0] === '--list') {
      const offsets = [...this.timezones.values()].map(offset => `${offset > 0 ? '+' : ''}${offset}`);
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.BLUE)
        .setTitle('Supported timezones')
        .addFields([
          { name: 'Name', value: [...this.timezones.keys()].join('\n'), inline: true },
          { name: 'UTC Offset', value: offsets.join('\n'), inline: true }
        ]);
      message.channel.send({ embeds: [embed] });
      return;
    }
    else if (args[0] === '--timezone') {
      return this.handleTimezone(message, args);
    }

    // Validate arguments
    if (args.length < 1 || args.length > 3) return;
    if (!/^(\d{4}-\d{2}-\d{2}\s)?\d{2}:\d{2}/.test(args.join(' '))) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Invalid format')
        .setDescription('Make sure the date format is YYYY-MM-DD HH:MM or just HH:MM');
      message.channel.send({ embeds: [embed] });
      return;
    }

    // Build 'YYYY-MM-DD HH:MM' string
    const isDaySpecified = args.findIndex(arg => arg.match(/\d{2}:\d{2}/)) === 1; // Is time the second argument?
    let dateString = isDaySpecified ? args.slice(0, 2).join(' ') : `${new Date().toISOString().slice(0, 10)} ${args.slice(0, 1)}`;

    // If timezone specified, else default to UTC
    if (args[args.length - 1].match(/^\w{3,4}/)) { // If last specified argument starts with 3 or 4 letters
      const timezone = args[args.length - 1];
      if (this.timezones.has(timezone)) {
        const offset = this.timezones.get(timezone);
        dateString += ` UTC${offset < 0 ? '' : '+'}${offset}`;
      }
      else if (/UTC[+-]\d{1,2}/.test(timezone)) {
        dateString += ` ${timezone}`;
      }
      else { // Nothing matched
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('Invalid timezone')
          .setDescription('Do `UTC±Offset`');
        message.channel.send({ embeds: [embed] });
        return;
      }
    }
    else { // Check if user has a stored timezone, though only if it was omitted in original message
      const savedOffset = await this.client.database.getUserTimezone(message.author.id);
      dateString += savedOffset ? ` ${savedOffset}` : ' UTC';
    }

    const unixTime = Math.floor(Date.parse(dateString) / 1000);
    if (isNaN(unixTime)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Something went wrong')
        .setDescription('Couldn\'t convert the passed arguments. Did you format everything correctly?');
      message.channel.send({ embeds: [embed] });
      return;
    }

    const formatted = `<t:${unixTime}:${isDaySpecified ? 'f' : 't'}>`;
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .addFields([
        { name: 'Display', value: formatted },
        { name: 'Raw', value: `\`${formatted}\`` }
      ]);
    message.channel.send({ embeds: [embed] });
  }

  private handleTimezone(message: Message, args: Array<string>): void {
    const action = args[1].toLowerCase();
    switch (action) {
      case 'set': {
        if (args.length !== 3) {
          const embed = new EmbedBuilder()
            .setColor(this.client.config.colors.RED)
            .setTitle('Invalid format')
            .setDescription('Do `--timezone set [UTC±x or named timezone]`');
          message.channel.send({ embeds: [embed] });
          return;
        }

        // Find offset specified by checking if it's a key in this.timezones or if matches UTC±x
        const timezone = args[2].toUpperCase();
        let utcOffset: string;
        if (this.timezones.has(timezone)) {
          const offset = this.timezones.get(timezone);
          utcOffset = `UTC${offset < 0 ? '' : '+'}${offset}`;
        }
        else if (/UTC[+-]\d{1,2}/.test(timezone)) utcOffset = timezone;
        else {
          const embed = new EmbedBuilder()
            .setColor(this.client.config.colors.RED)
            .setTitle('Invalid timezone')
            .setDescription('Do `UTC±Offset` or a named timezone.\nSee `--list` for a list of supported timezones.');
          message.channel.send({ embeds: [embed] });
          return;
        }

        // Bind timezone to user id
        this.client.database.setUserTimezone(message.author.id, utcOffset);
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.GREEN)
          .setTitle('Timezone set')
          .setDescription(`Your offset is now ${utcOffset}`);
        message.channel.send({ embeds: [embed] });
        return;
      }

      case 'reset': {
        this.client.database.removeUserTimezone(message.author.id);
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.GREEN)
          .setTitle('Timezone reset')
          .setDescription('Your timezone has been reset');
        message.channel.send({ embeds: [embed] });
        return;
      }
    
      default: {
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('Invalid action')
          .setDescription('Accepted arguments are `set` and `reset`.');
        message.channel.send({ embeds: [embed] });
        return;
      }
    }
  }
}