import { ChatInputCommandInteraction, EmbedBuilder, GuildTextBasedChannel, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Purge extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Delete messages')
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(option => option
        .setName('count')
        .setDescription('The number of messages to delete. Limit 100')
        .setRequired(true)
      );
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const count = interaction.options.getInteger('count')!;

    if (count < 1 || count > 100) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Invalid argument')
        .setDescription('Specify a number between 1 and 100.');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    try {
      const channel = interaction.channel as GuildTextBasedChannel;
      channel.bulkDelete(count);
    }
    catch (error) {
      console.log(error);
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Error')
        .setDescription('An error was encountered while trying to delete messages.')
        .addFields({ name: 'Error message', value: error instanceof Error ? error.message : 'Error' });
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const successEmbed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Success')
      .setDescription(`Successfully deleted ${count} messages.`);
    interaction.reply({ embeds: [successEmbed], ephemeral: true });
  }
}