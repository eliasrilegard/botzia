import { Message, MessageEmbed } from 'discord.js';
import Command from '../../bot/command';

class DynamicTime extends Command {
  private timezones: Map<string, number>;

  public constructor() {
    super(
      'dynamictime',
      'Convert a timestamp (UTC) to dynamic date-time display',
      ['[YYYY-MM-DD] [HH:MM] (Timezone or UTC±Offset)', '--list'],
      { aliases: ['dtime'] }
    );

    this.timezones = new Map([
      ['UTC', 0],
      ['CET', 1],
      ['CEST', 2]
    ]);
  }

  public async execute(message: Message, args: Array<string>): Promise<void> {
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
          .setDescription('Do \'UTC±Offset\'');
        message.channel.send({ embeds: [embed] });
        return;
      }
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
}

export default DynamicTime;