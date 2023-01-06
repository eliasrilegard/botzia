import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class DynamicTime extends SlashCommand {
  private readonly timezones: Map<string, string>;
  
  constructor(client: Bot) {
    const timezones = new Map([
      ['UTC', '+00:00'],
      ['CET', '+01:00'],
      ['CEST', '+02:00'],
      ['EET', '+02:00'],
      ['ACDT', '+10:30']
    ]);

    const data = new SlashCommandBuilder()
      .setName('dynamictime')
      .setDescription('Dynamic date-time display commands')
      .addSubcommand(cmd => cmd
        .setName('convert')
        .setDescription('Convert a timestamp to dynamic date-time display')
        .addStringOption(option => option
          .setName('timestamp')
          .setDescription('The date (can be omitted) and time of the timestamp: YYYY-MM-DD HH:MM')
          .setRequired(true)
        )
        .addStringOption(option => {
          for (const [name, value] of timezones.entries()) option.addChoices({ name, value });
          return option
            .setName('timezone-name')
            .setDescription('Name of timezone (mutually exclusive with utc-offset)');
        })
        .addStringOption(option => option
          .setName('utc-offset')
          .setDescription('Offset from UTC: ±XX:XX (mutually exlusive with timezone-name)')
        )
      )
      .addSubcommandGroup(group => group
        .setName('timezone')
        .setDescription('Manage default timezone')
        .addSubcommand(cmd => cmd
          .setName('list')
          .setDescription('List all supported timezones')
        )
        .addSubcommand(cmd => cmd
          .setName('get')
          .setDescription('See what your current default timezone is')
        )
        .addSubcommand(cmd => cmd
          .setName('set')
          .setDescription('Set a custom default timezone')
          .addStringOption(option => {
            for (const name of timezones.keys()) {
              if (name !== 'UTC') option.addChoices({ name: name, value: name });
            }
            return option
              .setName('timezone')
              .setDescription('The abbreviation of the timezone to set')
              .setRequired(true);
          })
        )
        .addSubcommand(cmd => cmd
          .setName('reset')
          .setDescription('Reset default timezone')
        )
      );
    super(data as SlashCommandBuilder, client);
    this.timezones = timezones;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subCommand = interaction.options.getSubcommand();

    // If timezone stuff
    if (interaction.options.getSubcommandGroup() !== null) {
      switch (subCommand) {
        case 'list': {
          const embed = new EmbedBuilder()
            .setColor(this.client.config.colors.BLUE)
            .setTitle('Supported timezones')
            .addFields([
              { name: 'Name', value: [...this.timezones.keys()].join('\n'), inline: true },
              { name: 'UTC Offset', value: [...this.timezones.values()].join('\n'), inline: true }
            ]);
          interaction.reply({ embeds: [embed] });
          return;    
        }
        case 'get': {
          const userTimezone = await this.client.database.getUserTimezone(interaction.user.id);
          const embed = new EmbedBuilder()
            .setColor(this.client.config.colors.BLUE)
            .setTitle('Current timezone')
            .setDescription(`Your current set timezone is ${userTimezone ?? 'UTC'}.`);
          interaction.reply({ embeds: [embed] });
          return;
        }
        case 'set': {
          // Find offset specified by checking if it's a key in this.timezones or if matches UTC±x
          const timezone = interaction.options.getString('timezone')!;
          let utcOffset: string;
          
          if (this.timezones.has(timezone)) utcOffset = `UTC${this.timezones.get(timezone)!}`;
          else if (/UTC[+-]\d{1,2}:\d{2}/.test(timezone)) utcOffset = timezone;
          else {
            const embed = new EmbedBuilder()
              .setColor(this.client.config.colors.RED)
              .setTitle('Invalid timezone')
              .setDescription('Do `UTC±XX:XX` or a named timezone.\nSee `--list` for a list of supported timezones.');
            interaction.reply({ embeds: [embed] });
            return;
          }

          // Bind timezone to user id
          this.client.database.setUserTimezone(interaction.user.id, utcOffset);
          const embed = new EmbedBuilder()
            .setColor(this.client.config.colors.GREEN)
            .setTitle('Timezone set')
            .setDescription(`Your offset is now ${utcOffset}`);
          interaction.reply({ embeds: [embed] });
          return;
        }
        case 'reset': {
          this.client.database.removeUserTimezone(interaction.user.id);
          const embed = new EmbedBuilder()
            .setColor(this.client.config.colors.GREEN)
            .setTitle('Timezone reset')
            .setDescription('Your timezone has been reset');
          interaction.reply({ embeds: [embed] });
          return;
        }
      }
    }

    // Normal stuff from here on out
    const timestamp = interaction.options.getString('timestamp')!; /* 20:00 */

    // Validate timestamp
    const isDaySpecified = /^\d{4}-\d{2}-\d{2}/.test(timestamp); /* false */
    if (!/^(\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}$/.test(timestamp)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Invalid format')
        .setDescription('Make sure the date format is YYYY-MM-DD HH:MM or just HH:MM');
      interaction.reply({ embeds: [embed] });
      return;
    }

    // If day isn't specified, default to today (bot time)
    let dateString = `${isDaySpecified ? timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10)} ${timestamp.slice(-5)}`;

    // If timezone specified, else default to UTC
    const timezoneName = interaction.options.getString('timezone-name');
    const utcOffset = interaction.options.getString('utc-offset');
    const offset = timezoneName ? timezoneName : utcOffset;
    if (offset) {
      const hourOffset = parseInt(offset.slice(1, 3));
      if (Math.abs(hourOffset) > 14) {
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('Invalid offset')
          .setDescription('Offsets can be at most ±14.');
        interaction.reply({ embeds: [embed] });
        return;
      }
      dateString += ` UTC${offset}`;
    }
    else { // Check if user has a stored timezone, though only if it was omitted in original message
      const savedOffset = await this.client.database.getUserTimezone(interaction.user.id);
      dateString += ` UTC${savedOffset}`;
    }

    const unixTime = Math.floor(Date.parse(dateString) / 1000);
    if (isNaN(unixTime)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Something went wrong')
        .setDescription('Couldn\'t convert the passed arguments. Did you format everything correctly?');
      interaction.reply({ embeds: [embed] });
      return;
    }

    const formatted = `<t:${unixTime}:${isDaySpecified ? 'f' : 't'}>`;
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .addFields([
        { name: 'Display', value: formatted },
        { name: 'Raw', value: `\`${formatted}\`` }
      ]);
    interaction.reply({ embeds: [embed] });
  }
}