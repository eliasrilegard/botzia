import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Res extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'res',
      'Calulates the number of upgrades required to max the resists of ult armor.',
      ['[res 1] (res 2) (res 3) (res 4) (upgrades) (primary stat)'],
      { belongsTo: 'dd' }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    const resists = args.slice(0, 4).map(res => parseInt(res)).sort((a, b) => b - a) // Sort resists in descending order
      .concat(args.slice(4).map(stat => parseInt(stat))); // Add upgrades and primary stat to the end
    if (resists.length < 1 || resists.length > 6 || resists.some(res => isNaN(res))) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Bad argument(s)')
        .setDescription('This command takes 1-6 numbers.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    const [availableUpgrades, primaryStat] = resists.splice(4); // Extract upgrades and primary stat
    let armorLevel = 1, levelsSpent = 0, intoPrimaryStat = 0;

    const canUp = (res: number, level: number) => (res < 22 || (level + 1) % 10 === 0) && res < 29;
    const getUpAmount = (res: number) => res < 22 ? Math.max(Math.trunc(0.15 * Math.abs(res)), 1) : 1;
    const upBestTarget = () => {
      for (let i = 0; i < resists.length; i++) {
        if (canUp(resists[i], armorLevel)) {
          levelsSpent++;
          resists[i] += getUpAmount(resists[i]);
          if (resists[i] === 0) resists[i] = 1;
          return;
        }
      }
      intoPrimaryStat++;
    };

    while (resists[resists.length - 1] < 29) {
      upBestTarget();
      armorLevel++;
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle(`It takes ${levelsSpent} levels to max the resistances`);
    if (availableUpgrades) {
      const upgradesRemaining = availableUpgrades - armorLevel - 1, potentialTotal = primaryStat + intoPrimaryStat + upgradesRemaining;
      if (primaryStat) embed.setDescription(`The piece will end up with ${potentialTotal} in the stat, or ${Math.ceil(1.4 * potentialTotal)} with boost.`);
      else embed.setDescription(`This leaves you with to invest a total of ${intoPrimaryStat + upgradesRemaining} points into a stat.`);
    }
    message.channel.send({ embeds: [embed] });
  }
}