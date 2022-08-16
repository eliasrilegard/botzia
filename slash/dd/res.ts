import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Res extends SlashCommand {
  constructor(client?: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('res')
      .setDescription('Calulate the number of upgrades required to max the resists of ult armor.')
      .addStringOption(option => option
        .setName('resistances')
        .setDescription('The resistances of the piece, separated by spaces. Maximum 4.')
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('upgrades')
        .setDescription('The upgrades of the piece')
      )
      .addIntegerOption(option => option
        .setName('stat')
        .setDescription('The main stat you want to upgrade')
      );
    super(data, client, { belongsTo: 'dd' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const resists = interaction.options.getString('resistances').split(/\s+/).map(res => parseInt(res));

    if (resists.length > 4) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Maximum number of resistances reached')
        .setDescription('A piece cannot have more than 4 resistances.');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const data = [...resists].sort((a, b) => b - a);

    const avalibleUpgrades = interaction.options.getInteger('upgrades');
    const primaryStat = interaction.options.getInteger('stat');

    let armorLevel = 1, levelsSpent = 0, intoPrimaryStat = 0;

    const canUp = (res: number, level: number) => (res < 22 || (level + 1) % 10 === 0) && res < 29;
    const getUpAmount = (res: number) => res < 22 ? Math.max(Math.trunc(0.15 * Math.abs(res)), 1) : 1;
    const upBestTarget = () => {
      for (let i = 0; i < data.length; i++) {
        if (canUp(data[i], armorLevel)) {
          levelsSpent++;
          data[i] += getUpAmount(data[i]);
          if (data[i] === 0) data[i] = 1;
          return;
        }
      }
      intoPrimaryStat++;
    };

    while (data[data.length - 1] < 29) {
      upBestTarget();
      armorLevel++;
    }

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`It takes ${levelsSpent} levels to max the resistances`)
      .setFooter({ text: `Resistances: ${resists.join(' ')}${avalibleUpgrades ? '  |  Avalible upgrades: ' + avalibleUpgrades : ''}${primaryStat ? '  |  Main stat: ' + primaryStat : ''}` });
    if (avalibleUpgrades) {
      const upgradesRemaining = avalibleUpgrades - armorLevel - 1, potentialTotal = primaryStat + intoPrimaryStat + upgradesRemaining;
      if (primaryStat) embed.setDescription(`The piece will end up with ${potentialTotal} in the stat, or ${Math.ceil(1.4 * potentialTotal)} with boost.`);
      else embed.setDescription(`This leaves you with to invest a total of ${intoPrimaryStat + upgradesRemaining} points into a stat.`);
    }

    interaction.reply({ embeds: [embed] });
  }
}