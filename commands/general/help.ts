import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Help extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('help')
      .setDescription('List all available commands or get info on a specific command');
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const categories = this.client.slashCommands.filter(cmd => (cmd.isCategory ?? false) && cmd.data.name !== 'dev');

    const categoryEmbeds = categories.map(categoryCmd => {
      const subCommands = this.client.slashCommands
        .filter(cmd => cmd.belongsTo === categoryCmd.data.name)
        .map(cmd => `**/${categoryCmd.data.name} ${cmd.data.name}** - ${cmd.data.description}`);
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.BLUE)
        .setTitle(categoryCmd.data.description)
        .addFields({ name: 'Available subcommands', value: subCommands.join('\n\n') });
      return embed;
    });

    const categoriesOverview = categories.map(categoryCmd => `**/${categoryCmd.data.name}** - ${categoryCmd.data.description}`).join('\n');
    const standaloneCommands = this.client.slashCommands
      .filter(cmd => {
        if (cmd.isCategory || cmd.belongsTo) return false;
        // Filter out commands a user cannot perform
        const data = cmd.data as SlashCommandBuilder;
        const serverPerms = BigInt(data.default_member_permissions ?? '');
        return interaction.memberPermissions?.has(serverPerms) ?? true; // .has() returns undefined in DMs
      })
      .map(cmd => `**/${cmd.data.name}** - ${cmd.data.description}`)
      .sort((a, b) => a.localeCompare(b))
      .join('\n');

    const mainPage = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Available commands');
    if (categoriesOverview.length) mainPage.addFields({ name: 'Category commands', value: categoriesOverview });
    if (standaloneCommands.length) mainPage.addFields({ name: 'General commands', value: standaloneCommands });

    this.sendMenu(interaction, [mainPage, ...categoryEmbeds]);
  }
}