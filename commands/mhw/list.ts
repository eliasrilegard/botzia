import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import UtilityFunctions from '../../utils/utilities';

export default class List extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('list')
      .setDescription('View a list of all monsters in Monster Hunter World: Iceborne');
    super(data, client, { belongsTo: 'mhw' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (this.client.mhw.monsters == null) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Monster data unavailable')
        .setDescription('Could not access monster data at this time.')
        .setFooter({ text: `If this issue persists please contact ${this.client.config.users.chrono_tag}` });
      interaction.reply({ embeds: [embed] });
      return;
    }

    const monsterNames = [...this.client.mhw.monsters.values()].map(monster => monster.title).sort((a, b) => a.localeCompare(b));
    const monstersPerPage = 20;

    // Split monsterNames into chunks and map each to an embed message
    const embeds = UtilityFunctions.chunk(monsterNames, monstersPerPage).map(chunk => {
      return new EmbedBuilder()
        .setColor(this.client.config.colors.GREEN)
        .addFields({ name: 'Monsters list', value: chunk.join('\n') });
    });
      
    this.sendMenu(interaction, embeds);
  }
}