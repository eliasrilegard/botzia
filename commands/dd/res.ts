import { Message, MessageEmbed } from 'discord.js';
import Command from '../../bot/command';

class Res extends Command {
  public constructor() {
    super(
      'res',
      'Calulates the number of upgrades required to max the resists of ult armor.',
      ['[Res 1] (Res 2) (Res 3) (Res 4) (Upgrades) (Primary stat)'],
      { belongsTo: 'dd' }
    );
  }

  public async execute(message: Message, args: Array<string>): Promise<void> {
    const resists = args.slice(0, 4).map(res => parseInt(res)).sort((a, b) => b - a) // Sort resists in descending order
      .concat(args.slice(4).map(stat => parseInt(stat))); // Add upgrades and primary stat to the end
    if (resists.length < 1 || resists.length > 6 || resists.some(res => isNaN(res))) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Bad argument(s)')
        .setDescription('This command takes 1-6 numbers.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    const [avalibleUpgrades, primaryStat] = resists.splice(4); // Extract upgrades and primary stat
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

    const embed = new MessageEmbed()
      .setColor('#0066cc')
      .setTitle(`It takes ${levelsSpent} levels to max the resistances`)
      .setDescription(`The final upgrade will be on level ${armorLevel}.`);
    if (avalibleUpgrades) {
      if (primaryStat) embed.addField('Additional info', `The piece will end up with ${primaryStat + intoPrimaryStat} in the primary stat and ${avalibleUpgrades - armorLevel - 1} upgrades remaining.`);
      else embed.addField('Additional info', `The piece will end up with ${avalibleUpgrades - armorLevel - 1} upgrades remaining.`); // -1 might need to be -2
      embed.setFooter({ text: 'Final (forging) upgrade not included in upgrades remaining.' });
    }
    message.channel.send({ embeds: [embed] });
  }
}

export default Res;