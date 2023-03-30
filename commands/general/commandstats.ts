import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, Snowflake } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import UtilityFunctions from '../../utils/utilities';

export default class CommandStats extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('commandstats')
      .setDescription('View usage statistics on a command')
      .setDMPermission(false)
      //.setAutocomplete(true)
      .addStringOption(option => option
        .setName('command-name')
        .setDescription('The command to view stats for. Category name included')
        .setRequired(true)
      );
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandName = interaction.options.getString('command-name')!.split(/\s+/).join(' ');

    let commandUsages: Array<[Snowflake, number]>;
    
    try {
      commandUsages = await this.client.database.getCommandUsage(interaction.guildId!, commandName);
    }
    catch (error) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Command stats not found')
        .setDescription('No stats for this command found in this server.\nDid you spell everything correctly?');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const embeds = UtilityFunctions.chunk(commandUsages, 20).map(usageList => {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.BLUE)
        .setTitle(`Command stats: ${commandName}`)
        .addFields({
          name: 'Top usage',
          value: usageList.map(userInfo => `${userInfo[1]} - <@${userInfo[0]}>`).join('\n')
        });
      return embed;
    });

    if (embeds.length > 1) {
      this.sendMenu(interaction, embeds);
    }
    else {
      interaction.reply({ embeds: [embeds[0]] });
    }
  }
}