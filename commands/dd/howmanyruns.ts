import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

type Stringifiable = {
  toString(): string;
}

const formatWithSpace = (n: number | string) => {
  const parts = n.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
};
const transpose = <T>(matrix: Array<Array<T>>) => matrix[0].map((_, i) => matrix.map(row => row[i]));
const codeblock = (s: string) => `\`\`\`${s}\`\`\``;

const longestString = <T extends Stringifiable>(arr: Array<T>) => Math.max(...arr.map(e => e.toString().length));
const padStrings = <T extends Stringifiable>(arr: Array<T>, minLength?: number) => arr.map(s => s.toString().padEnd(Math.max(minLength ?? 0, longestString(arr) + 4)));

export default class HowManyRuns extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('howmanyruns')
      .setDescription('Calculate number of runs required to obtain an item with a given drop chance')
      .addIntegerOption(option => option
        .setName('probability')
        .setDescription('x in 1/x for the probability') // Rephrase
        .setMinValue(1)
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('items-per-run')
        .setDescription('The number of items you get in a single run')
        .setMinValue(1)
      )
      .addNumberOption(option => option
        .setName('time-per-run')
        .setDescription('The time (in minutes) to complete a single run')
        .setMinValue(0.01)
      );
    super(data, client, { belongsTo: 'dd' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const probabilityInput = interaction.options.getInteger('probability')!;
    const probability = 1 / probabilityInput;
    const itemsPerRun = interaction.options.getInteger('items-per-run');
    const timePerRun = interaction.options.getNumber('time-per-run');

    const probabilities = [10, 25, 50, 75, 90, 95, 99] as const;
    
    /**
     * Probability p of getting at least 1 success in n runs \
     * p = 1 - (1 - probabilityOfSuccess) ^ n \
     * n = ln(1 - p) / ln(1 - probabilityOfSuccess)
     * @returns n
     */
    const attemptsRequired = (p: number) => Math.round(Math.log(1 - p) / Math.log(1 - probability));
    
    const itemsRequired = probabilities.map(p => attemptsRequired(p / 100));

    const data: Array<Array<string | number>> = [
      padStrings(['Prob', ...probabilities.map(n => n + '%')]),
      padStrings(['Items', ...itemsRequired.map(n => formatWithSpace(n))], 6)
    ];

    let description = 'Items: The total amount of items to have an X% chance of at least 1 rare drop';

    if (itemsPerRun) {
      description += `\nRuns: The number of runs required, assuming **${itemsPerRun}** items per run`;
      const runsRequired = itemsRequired.map(itemCount => formatWithSpace(Math.round(itemCount / (itemsPerRun ?? 1))));
      data.push(padStrings(['Runs', ...runsRequired], 6));
    }
    if (timePerRun) {
      description += `\nHours: The number of hours spent farming, assuming one run takes **${timePerRun}** minutes`;
      const hoursRequired = itemsRequired.map(itemCount => formatWithSpace((itemCount * (timePerRun ?? 1) / 60).toFixed(1)));
      data.push(padStrings(['Hours', ...hoursRequired], 6));
    }
    
    const prepared = transpose(data).map(row => row.join(''));
    prepared.splice(1, 0, ''); // Insert a '' at index 1
    const content = codeblock(prepared.join('\n'));

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Drop Chance Analysis')
      .setDescription(description)
      .addFields({
        name: `For an item with drop chance **1/${probabilityInput}**, here are the relevant rates.`,
        value: content
      });

    interaction.reply({ embeds: [embed] });
  }
}