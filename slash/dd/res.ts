import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Res extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('res')
      .setDescription('Get the number of ups required to max the res of ult and above armor')
      .addStringOption(option => option
        .setName('resistances')
        .setDescription('The resistances of the piece, separated by spaces')
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('upgrades')
        .setDescription('The number of upgrades on the piece')
      )
      .addIntegerOption(option => option
        .setName('primary-stat')
        .setDescription('The primary stat of the piece, which will be upgraded alongside the resistances')
      )
      .addIntegerOption(option => option
        .setName('secondary-stat')
        .setDescription('The secondary stat if you want to get the stat total of the piece. Doesn\'t get upgraded')
      )
      .addIntegerOption(option => option
        .setName('fix-slot')
        .setDescription('The slot to upgrade further to fix another 3 res piece. (Number between 1-4)')
      );

    super(data, client, { belongsTo: 'dd' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const resists = interaction.options.getString('resistances')!.split(/\s+/).map(res => parseInt(res));
    
    const upgrades = interaction.options.getInteger('upgrades');
    const primaryStat = interaction.options.getInteger('primary-stat');
    const secondaryStat = interaction.options.getInteger('secondary-stat');
    const fixSlot = interaction.options.getInteger('fix-slot');

    if ([...resists, upgrades, primaryStat, secondaryStat, fixSlot].some(res => res !== null ? Math.abs(res) > 1000 : false)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Reasonable numbers expected');
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (resists.length < 3 || resists.length > 4) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('3 or 4 resistances expected')
        .setDescription('Separate the resistances by spaces.');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (fixSlot != null) {
      if (resists.length === 3) {
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('<a:HUHH:1019679010466304061>  What are you trying to calculate?');
        interaction.reply({ embeds: [embed] });
        return;
      }
      if (fixSlot < 1 || fixSlot > 4) {
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('Invalid slot')
          .setDescription('Specify a number between 1 and 4.');
        interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }
    
    const loneRes = fixSlot != null ? resists[fixSlot - 1] : NaN;
    const data = [...resists].sort((a, b) => b - a);
    const loneIndex = data.indexOf(loneRes);

    const targetLevel = resists.length === 3 ? 35 : loneIndex !== -1 ? 23 : 29;

    let armorLevel = 1, levelsSpent = 0, intoPrimaryStat = 0;

    const getTargetLevel = (index: number) => index === loneIndex ? 58 : targetLevel;
    const canUp = (index: number) => (data[index] < 22 || (armorLevel + 1) % 10 === 0) && data[index] < getTargetLevel(index);
    const getUpAmount = (res: number) => res < 22 ? Math.max(Math.trunc(0.15 * Math.abs(res)), 1) : 1;
    const upgrade = () => {
      for (let i = 0; i < data.length; i++) {
        if (canUp(i)) {
          levelsSpent++;
          data[i] += getUpAmount(data[i]);
          if (data[i] === 0) data[i] = 1;
          return;
        }
      }
      intoPrimaryStat++;
    };

    while (data[data.length - 1] < targetLevel || (loneIndex !== -1 && data[loneIndex] < 58)) {
      upgrade();
      armorLevel++;
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle(`It takes ${levelsSpent} levels to max the resistances`)
      .setFooter({ text: `Resistances: ${resists.join(' ')}${upgrades ? '  |  Avalible upgrades: ' + upgrades : ''}${primaryStat ? '  |  Main stat: ' + primaryStat : ''}${secondaryStat ? '  | Secondary stat: ' + secondaryStat : ''}` });
    
    let description = '';
    if (upgrades) {
      const upgradesRemaining = upgrades - armorLevel - 1;
      if (primaryStat) {
        const potentialTotal = primaryStat + intoPrimaryStat + upgradesRemaining;
        description = `The piece will end up at **${potentialTotal}** in the main stat, or **${Math.ceil(1.4 * potentialTotal)}** with set bonus.`;
        if (secondaryStat) description += `\nThis results in a stat total of **${Math.ceil(1.4 * potentialTotal) + Math.ceil(1.4 * secondaryStat)}**.`;
      }
      else description = `This leaves you with a total of **${intoPrimaryStat + upgradesRemaining}** points to invest in a stat.`;
    }
    embed.setDescription(`${description}\nThe final resistance upgrade will be on lvl **${armorLevel}**.`);

    interaction.reply({ embeds: [embed] });
  }
}