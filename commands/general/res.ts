import { Message, MessageEmbed } from 'discord.js';
import Command from '../../bot/command';

class Res extends Command {
  public constructor() {
    super('res', 'Calculate the number of upgrades required up max the resists of ult items.', '[res 1] [res 2] [res 3] [res 4]', { devOnly: true });
  }

  public execute(message: Message, args: string[]): void {
    const resists = [...args].map(str => parseInt(str)).sort((a, b) => b - a);
    if (resists.length < 1 || resists.length > 4 || resists.some(res => Number.isNaN(res))) {
      const embed = new MessageEmbed()
        .setColor('#cc0000')
        .setTitle('Bad argument(s)')
        .setDescription('This command takes 1-4 numbers.');
      message.channel.send({ embeds: [embed] });
      return;
    }

    let armorLevel = 1, levelsSpent = 0;
 
    const canUp = (res: number, lvl: number) => (res < 22 || (lvl + 1) % 10 == 0) && res < 29;
    const getUpAmount = (res: number) => res < 22 ? Math.max(Math.trunc(0.15 * Math.abs(res)), 1) : 1;
    const upBestTarget = () => {
      for (let i = 0; i < resists.length; i++) {
        if (canUp(resists[i], armorLevel)) {
          levelsSpent++;
          resists[i] += getUpAmount(resists[i]);
          if (resists[i] == 0) resists[i]++;
          return;
        }
      }
    };

    while (resists[resists.length - 1] < 29) {
      upBestTarget();
      armorLevel++;
    }

    const embed = new MessageEmbed()
      .setColor('#0066cc')
      .setTitle(`It takes ${levelsSpent} upgrades to max the resistances.`)
      .setDescription(`The final upgrade will be on lvl ${armorLevel}.`);
    message.channel.send({ embeds: [embed] });
  }
}

export default Res;