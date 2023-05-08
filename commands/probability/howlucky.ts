import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import { verifyProbability } from './howmanyruns';

const choose = (n: number, k: number) => {
  if (k < 0 || k > n) return 0;
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 1; i <= k; i++) result *= (n - k + i) / i;
  return Math.round(result);
};

export default class HowLucky extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('howlucky')
      .setDescription('Calculate how lucky a drop was')
      .addStringOption(option => option
        .setName('probability')
        .setDescription('x in 1/x')
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('try-count')
        .setDescription('The number of items/tries taken')
        .setMinValue(1)
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('success-count')
        .setDescription('The number of successes/rare items dropped')
        .setMinValue(1)
      );
    super(data, client, { belongsTo: 'probability' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const probabilityInput = interaction.options.getString('probability')!;
    const tryCount = interaction.options.getInteger('try-count')!;
    const successCount = interaction.options.getInteger('success-count') ?? 1;
    
    const probability = verifyProbability(probabilityInput);

    if (probability === -1) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Invalid Format')
        .setDescription('The argument \`probability\` must be a decimal number or a fraction, and be between 0 and 1.');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // P(X >= m | n tries) =
    // 1 - P(X < m | n tries) =
    // 1 - \sum_{k = 0}^{m - 1} {n \choose k} p^k (1 - p)^{n - k}
    //
    // Here m = successCount; n = tryCount

    let result = 1;
    for (let k = 0; k < successCount; k++) {
      result -= choose(tryCount, k) * Math.pow(probability, k) * Math.pow(1 - probability, tryCount - k);
    }

    const displayProbability = (result * 100).toPrecision(result >= 0.01 ? 3 : 2);

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('How lucky were you?')
      .setDescription(`With a drop chance of **${probabilityInput}**, getting ${successCount > 1 ? `**${successCount}** drops` : 'a drop'} within **${tryCount}** tries\nhas a **${displayProbability}%** chance of happening.`);

    interaction.reply({ embeds: [embed] });    
  }
}