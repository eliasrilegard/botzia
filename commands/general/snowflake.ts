import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Snowflake extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('snowflake')
      .setDescription('Convert a Discord snowflake to a dynamic timestamp')
      .addStringOption(option => option
        .setName('snowflake')
        .setDescription('The snowflake to convert')
        .setRequired(true)
      );
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const snowflake = interaction.options.getString('snowflake')!;
    if (!/^\d{1,20}$/.test(snowflake)) {
      const embed = new EmbedBuilder().setTitle('Invalid snowflake');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const binary = parseInt(snowflake).toString(2).padStart(64, '0');
    const excerpt = binary.substring(0, 42);
    const decimal = parseInt(excerpt, 2);
    const unixMillis = decimal + 1_420_070_400_000; // Discord constant
    const unixSeconds = unixMillis.toString().slice(0, -3);
    
    const formatted = `<t:${unixSeconds}:D> at <t:${unixSeconds}:T>`;
    
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle(formatted)
      .setFooter({ text: `Snowflake: ${snowflake}` });
    interaction.reply({ embeds: [embed] });
  }
}