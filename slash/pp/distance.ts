import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Distance extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('distance')
      .setDescription('Calculate the distance between two cities')
      .addStringOption(option => option
        .setName('origin')
        .setDescription('The origin city')
        .setAutocomplete(true)
        .setRequired(true)
      )
      .addStringOption(option => option
        .setName('destination')
        .setDescription('The destination city')
        .setAutocomplete(true)
        .setRequired(true)
      );
    super(data, client, { belongsTo: 'pp' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const originName = interaction.options.getString('origin')!;
    const destName = interaction.options.getString('destination')!;

    const start = this.client.pocketPlanes.cities.get(originName.replace(/[\s\.'-]+/g, '').toLowerCase());
    const end = this.client.pocketPlanes.cities.get(destName.replace(/[\s\.'-]+/g, '').toLowerCase());

    if (!start) return this.invalidCity(interaction, originName);
    if (!end) return this.invalidCity(interaction, destName);

    const distance = Math.floor(Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2))) * 4;
    const limit = Math.min(start.class, end.class);

    const viablePlanes = [...this.client.pocketPlanes.planes.values()]
      .filter(plane => plane.range * 1.2 >= distance && plane.class <= limit) // Test for max range
      .sort((p1, p2) => p1.name.toLowerCase().localeCompare(p2.name.toLowerCase()));

    // rangeUpgrade solution for: distance = Math.round(plane.range * (1 + rangeUpgrade / 20))
    // Then mapped to an upgrade level by ceiling (plain round?) it and making it non-negative.
    const rangeUpgradeRequired = viablePlanes
      .map(plane => Math.max(0, Math.ceil(20 * (distance / plane.range - 1))))
      .map(upgLvl => upgLvl > 0 ? ` (Lvl ${upgLvl} Range Upgrade)${upgLvl === 4 ? ' [VIP]' : ''}` : '');

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Distance')
      .setDescription(`The distance between **${start.name}** and **${end.name}** is **${distance}** miles.\nThis route is limited to **Class ${limit}**${limit > 1 ? ' and below' : '' }.`)
      .addFields({
        name: 'Viable planes for this route',
        value: viablePlanes.length > 0 ? viablePlanes.map((plane, i) => `${plane.name}${rangeUpgradeRequired[i]}`).join('\n') : 'None'
      });
    interaction.reply({ embeds: [embed] });
  }

  async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused().replace(/[\s\.'-]+/g, '').toLowerCase();
    const options: Array<{ name: string, value: string }> = [];
    for (const [name, city] of this.client.pocketPlanes.cities) {
      if (name.includes(focusedValue)) {
        options.push({ name: city.name, value: name });
      }
    }
    await interaction.respond(options.length < 26 ? options : []);
  }

  private invalidCity(interaction: ChatInputCommandInteraction, name: string): void {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.RED)
      .setTitle('City not found')
      .setDescription(`**${name}** is not a valid city. Check your spelling and try again!`);
    interaction.reply({ embeds: [embed], ephemeral: true });
  }
}