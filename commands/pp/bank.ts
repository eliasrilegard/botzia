import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Bank extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('bank')
      .setDescription('Calculate the amount of coins you\'ll recieve by trading bux')
      .addIntegerOption(option => option
        .setName('bux')
        .setDescription('The amount of bux you\'d like to transfer')
        .setRequired(true)
      );
      // .addIntegerOption(option => option
      //   .setName('coins')
      //   .setDescription('Your current amount of coins (for calculating total)')
      // );
    super(data, client, { belongsTo: 'pp' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const bux = interaction.options.getInteger('bux')!;
    // const coins = interaction.options.getInteger('coins');

    const exchangeRate = 500 + bux / 2;
    const resultingCoins = Math.floor(bux * exchangeRate);

    const nf = new Intl.NumberFormat('en-CA');

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Bux transfer')
      .setDescription(`Transferring **${nf.format(bux)}** bux results in **${nf.format(resultingCoins)}** coins.\nTransfer rate: **${nf.format(exchangeRate)}** coins per bux.`);
    interaction.reply({ embeds: [embed] });
  }
}