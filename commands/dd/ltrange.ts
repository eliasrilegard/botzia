import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class LTRange extends Command {
  // These offsets are taken from https://quarplet.com/chaintargets_breakpoints.txt
  // Since we're storing the breakpoints in an array, we need to offset the index by some value
  private normal: Array<number>; // +6
  private upped: Array<number>; // +17

  constructor() {
    super(
      'ltrange',
      'Finds the closest LT breakpoints to your current range',
      ['[current range]'],
      { belongsTo: 'dd' }
    );

    this.normal = [0, 1, 2, 4, 6, 8, 11, 14, 19, 23, 29, 35, 43, 51, 60, 70, 81, 93, 106, 120, 136, 153, 171, 190, 211, 233, 257, 282, 309, 337, 367, 399, 432, 468, 504, 543, 584, 626, 671, 717, 766, 816, 869, 924, 981, 1040, 1101, 1165, 1231, 1300, 1370, 1444, 1519, 1598, 1679, 1762, 1848, 1937, 2028, 2122, 2219, 2319, 2421, 2526, 2635, 2746, 2860, 2977, 3098, 3221, 3347, 3477, 3610, 3746, 3885, 4027, 4173, 4322, 4475, 4631, 4790, 4953, 5119, 5289, 5463, 5640, 5820, 6005, 6193, 6385, 6581, 6780, 6983, 7190, 7402, 7617, 7835, 8058, 8285, 8516, 8752, 8991, 9234, 9482, 9734, 9990];
    this.upped = [0, 7, 15, 24, 34, 45, 57, 70, 84, 100, 117, 135, 154, 175, 197, 221, 246, 273, 301, 331, 363, 396, 432, 468, 507, 548, 590, 635, 681, 730, 780, 833, 888, 945, 1004, 1065, 1129, 1195, 1264, 1334, 1408, 1483, 1562, 1643, 1726, 1812, 1901, 1992, 2086, 2183, 2283, 2385, 2490, 2599, 2710, 2824, 2941, 3062, 3185, 3311, 3441, 3574, 3710, 3849, 3991, 4137, 4286, 4439, 4595, 4754, 4917, 5083, 5253, 5427, 5604, 5784, 5969, 6157, 6349, 6545, 6744, 6947, 7154, 7366, 7581, 7799, 8022, 8249, 8480, 8716, 8955, 9198, 9446, 9698, 9954];
  }

  async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    if (args.length > 1) {
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('Check arguments')
        .setDescription('This command takes 1 argument.')
        .addField('Usage', this.howTo(await client.prefix(message), true));
      message.channel.send({ embeds: [embed] });
      return;
    }

    const currentRange = parseInt(args[0]);
    if (isNaN(currentRange) || currentRange < 0 || currentRange > 9999) {
      const embed = new MessageEmbed()
        .setColor(client.config.colors.RED)
        .setTitle('Check arguments')
        .setDescription('This command takes a number between 0 and 9999 as its argument.')
        .addField('Usage', this.howTo(await client.prefix(message), true));
      message.channel.send({ embeds: [embed] });
      return;
    }

    // Find the 3 closest breakpoints to the current range
    const [indexNormal, ...closestNormal] = this.closestBreakpoint(currentRange, this.normal);
    const [indexUpped, ...closestUpped] = this.closestBreakpoint(currentRange, this.upped);

    // Construct the embed content by showing the 3 closest breakpoints and their values
    const valueNormal = `\`\`\`${closestNormal[0]} - ${indexNormal + 5}\n${closestNormal[1]} - ${indexNormal + 6}\n${closestNormal[2]} - ${indexNormal + 7}\`\`\``;
    const valueUpped = `\`\`\`${closestUpped[0]} - ${indexUpped + 16}\n${closestUpped[1]} - ${indexUpped + 17}\n${closestUpped[2]} - ${indexUpped + 18}\`\`\``;

    const embed = new MessageEmbed()
      .setColor(client.config.colors.BLUE)
      .setTitle('Closest breakpoints')
      .setDescription('Here are the closest breakpoints to your current range.\n\`Range - Targets\`')
      .addFields(
        { name: 'Normal', value: valueNormal, inline: true },
        { name: 'Upgraded', value: valueUpped, inline: true }
      );
    message.channel.send({ embeds: [embed] });
  }

  private closestBreakpoint(range: number, breakpoints: Array<number>): Array<number> {
    // Constrain index to 1 and length - 2. Should range not be found, findIndex will return -1
    const foundIndex = breakpoints.findIndex(bp => bp >= range);
    const index = Math.max(1, foundIndex !== -1 ? foundIndex : breakpoints.length - 2);
    return [index, breakpoints[index - 1], breakpoints[index], breakpoints[index + 1]];
  }
}