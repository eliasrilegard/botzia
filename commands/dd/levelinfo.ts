import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import levelData from '../../database/dungeon_defenders/leveldata.json';

export default class LevelInfo extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('levelinfo')
      .setDescription('View level requirements for different items');
    super(data, client, { belongsTo: 'dd' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const padder = (name: string, weapon: string, armor: string, pet: string) =>
      `${name.padEnd(14)}${weapon.padEnd(9)}${armor.padEnd(9)}${pet}`;

    const desc = [padder('Name/Level', 'Weapons', 'Armor', 'Pets')];

    for (const quality of levelData) {
      desc.push(padder(quality.name, quality.levels.weapons, quality.levels.armor, quality.levels.pets));
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Level Info')
      .setDescription(`\`\`\`${desc.join('\n')}\`\`\``);
    interaction.reply({ embeds: [embed] });
  }
}