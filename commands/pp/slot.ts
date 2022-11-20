import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Slot extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('slot')
      .setDescription('Calculate the cost of one or multiple slots')
      .addIntegerOption(option => option
        .setName('slot-1')
        .setDescription('The slot to calculate the cost for')
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('slot-2')
        .setDescription('Optional second slot, which forms a range from the first slot to the second, inclusive.')
      );
    super(data, client, { belongsTo: 'pp' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const slot1 = interaction.options.getInteger('slot-1')!;
    const slot2 = interaction.options.getInteger('slot-2');

    const cost = (slot: number) => 25 * (Math.pow(slot, 4) - 16 * Math.pow(slot, 3) + 96 * Math.pow(slot, 2) - 216 * slot + 156) - (slot % 2 === 0 ? 0 : 25);

    let totalCost = cost(slot1);

    if (slot2) {
      for (let i = slot1 + 1; i <= slot2; i++) totalCost += cost(i);
    }

    const nf = Intl.NumberFormat('en-CA');

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Slot Cost')
      .setDescription(`The ${slot2 == null ? `cost of slot **${slot1}**` : `combined cost of slots **${slot1}** to **${slot2}**`} is **${nf.format(totalCost)}** coins.`);
    interaction.reply({ embeds: [embed] });
  }
}