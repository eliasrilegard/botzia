import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class DynamicTime extends Command {
  private timezones: Map<string, number>;

  public constructor() {
    super(
      'dynamictime',
      'Convert a timestamp (UTC) to dynamic date-time display',
      ['[YYYY-MM-DD] [HH:MM] (timezone or UTC±offset)', '--list', '--timezone [set or reset]'],
      { aliases: ['dtime'] }
    );

    this.timezones = new Map([
      ['UTC', 0],
      ['CET', 1],
      ['CEST', 2]
    ]);
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    // If timezone list requested
    if (args.length === 1 && args[0] === '--list') {
      const offsets = [...this.timezones.values()].map(offset => `${offset > 0 ? '+' : ''}${offset}`);
      const embed = new MessageEmbed()
        .setColor('#0066cc')
        .setTitle('Supported timezones')
        .addFields([
          { name: 'Name', value: [...this.timezones.keys()].join('\n'), inline: true },
          { name: 'UTC Offset', value: offsets.join('\n'), inline: true }
        ]);
      message.channel.send({ embeds: [embed] });
      return;
    }
    else if (args[0] === '--timezone') {
      return this.handleTimezone(message, args, client);
    }

    // Validate arguments
    if (![2, 3].includes(args.length)) return;
    if (!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(args.slice(0, 2).join(' '))) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Invalid format')
        .setDescription('Make sure the date format is YYYY-MM-DD HH:MM');
      message.channel.send({ embeds: [embed] });
      return;
    }

    let dateString = args.slice(0, 2).join(' ');

    // If timezone specified, else default to UTC
    if (args[2]) {
      if (this.timezones.has(args[2])) {
        const offset = this.timezones.get(args[2]);
        dateString += ` UTC${offset < 0 ? '' : '+'}${offset}`;
      }
      else if (/UTC[+-]\d{1,2}/.test(args[2])) {
        dateString += ` ${args[2]}`;
      }
      else { // Nothing matched
        const embed = new MessageEmbed()
          .setColor('#cc0000')
          .setTitle('Invalid timezone')
          .setDescription('Do `UTC±Offset`');
        message.channel.send({ embeds: [embed] });
        return;
      }
    }
    else { // Check if user has a stored timezone, though only if it was omitted in original message
      const savedOffset = await client.apiClient.getUserTimezone(message.author.id);
      dateString += savedOffset ? ` ${savedOffset}` : ' UTC';
    }

    const unixTime = Math.floor(Date.parse(dateString) / 1000);
    if (isNaN(unixTime)) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Something went wrong')
        .setDescription('Couldn\'t convert the passed arguments. Did you format everything correctly?');
      message.channel.send({ embeds: [embed] });
      return;
    }

    const embed = new MessageEmbed()
      .setColor('#0066cc')
      .addFields([
        { name: 'Display', value: `<t:${unixTime}:f>` },
        { name: 'Raw', value: `\`<t:${unixTime}:f>\`` }
      ]);
    message.channel.send({ embeds: [embed] });
  }

  private handleTimezone(message: Message, args: Array<string>, client: Bot): void {
    const action = args[1].toLowerCase();
    switch (action) {
      case 'set': {
        if (args.length !== 3) {
          const embed = new MessageEmbed()
            .setColor('#cc0000')
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
          const embed = new MessageEmbed()
            .setColor('#cc0000')
            .setTitle('Invalid timezone')
            .setDescription('Do `UTC±Offset` or a named timezone.\nSee `--list` for a list of supported timezones.');
          message.channel.send({ embeds: [embed] });
          return;
        }

        // Bind timezone to user id
        client.apiClient.setUserTimezone(message.author.id, utcOffset);
        const embed = new MessageEmbed()
          .setColor('#00cc00')
          .setTitle('Timezone set')
          .setDescription(`Your offset is now ${utcOffset}`);
        message.channel.send({ embeds: [embed] });
        return;
      }

      case 'reset': {
        client.apiClient.removeUserTimezone(message.author.id);
        const embed = new MessageEmbed()
          .setColor('#00cc00')
          .setTitle('Timezone reset')
          .setDescription('Your timezone has been reset');
        message.channel.send({ embeds: [embed] });
        return;
      }
    
      default: {
        const embed = new MessageEmbed()
          .setColor('#cc0000')
          .setTitle('Invalid action')
          .setDescription('Accepted arguments are `set` and `reset`.');
        message.channel.send({ embeds: [embed] });
        return;
      }
    }
  }
}

export default DynamicTime;