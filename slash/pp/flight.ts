import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import { City } from '../categories/pp';

export default class Flight extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('flight')
      .setDescription('Calculate the stats of a flight from A to B')
      .addStringOption(option => option
        .setName('city-path')
        .setDescription('A comma separated list of cities')
        .setRequired(true)
      )
      .addStringOption(option => option
        .setName('plane')
        .setDescription('The plane to use for the flight')
        .setAutocomplete(true)
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('upgrade-range')
        .setDescription('The range upgrade of the plane (0-4)')
      )
      .addIntegerOption(option => option
        .setName('upgrade-speed')
        .setDescription('The range upgrade of the plane (0-4)')
      )
      .addIntegerOption(option => option
        .setName('upgrade-weight')
        .setDescription('The range upgrade of the plane (0-4)')
      );
    super(data, client, { belongsTo: 'pp' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const cleanup = (str: string) => str.replace(/[\s\.'-]+/g, '').toLowerCase();

    const pathName = interaction.options.getString('city-path')!;
    const planeName = interaction.options.getString('plane')!;

    const upgradeRange = interaction.options.getInteger('upgrade-range') ?? 0;
    const upgradeSpeed = interaction.options.getInteger('upgrade-speed') ?? 0;
    const upgradeWeight = interaction.options.getInteger('upgrade-weight') ?? 0;

    // Check path
    const cityNames = pathName.split(/\s*,\s*/);
    const cities = cityNames.map(cityName => this.client.pocketPlanes.cities.get(cleanup(cityName)));

    const plane = this.client.pocketPlanes.planes.get(cleanup(planeName));

    const badIndices = cities.reduce((acc: Array<number>, ele, i) => {
      if (ele === undefined) acc.push(i);
      return acc;
    }, []);

    const invalidRange = upgradeRange < 0 || upgradeRange > 4;
    const invalidSpeed = upgradeSpeed < 0 || upgradeSpeed > 4;
    const invalidWeight = upgradeWeight < 0 || upgradeWeight > 4;

    if (badIndices.length > 0 || !plane || invalidRange || invalidSpeed || invalidWeight) {
      const errors = badIndices.map(i => `**${cityNames[i]}**: Not a valid city`);

      if (!plane) errors.unshift(`**${planeName}**: Not a valid plane. Check your spelling?`);
      if (invalidRange) errors.push(`**${upgradeRange}**: Invalid range upgrade. Specity a number between **0** to **4**.`);
      if (invalidSpeed) errors.push(`**${upgradeSpeed}**: Invalid speed upgrade. Specity a number between **0** to **4**.`);
      if (invalidWeight) errors.push(`**${upgradeWeight}**: Invalid weight upgrade. Specity a number between **0** to **4**.`);

      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Problems detected')
        .addFields({
          name: 'The following problems were detected',
          value: errors.join('\n')
        });
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    
    const distance = (c1: City, c2: City) => Math.floor(Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2))) * 4;
    const distances: Array<number> = [];
    for (let i = 0; i < cities.length - 1; i++) distances.push(distance(cities[i]!, cities[i + 1]!));
    
    const range = Math.round(plane.range * (1 + upgradeRange / 20));

    const badDistances = distances.reduce((acc: Array<number>, d, i) => {
      if (d > range) acc.push(i);
      return acc;
    }, []);

    if (badDistances.length > 0) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Problems detected')
        .addFields({
          name: 'The following problems were detected',
          value: badDistances.map((d, i) => `**${cities[i]!}** to **${cities[i + 1]!}** (${d} mi.) is not possible with the given range (${plane!.range} mi.).`).join('\n')
        });
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Calculate stats
    const rawDistance = (c1: City, c2: City) => distance(c1, c2) / 4; // Some calculations don't use the factor 4

    const directDistance = rawDistance(cities[0]!, cities[cities.length - 1]!);
    const coinValue = Math.ceil(1.25 * (directDistance + 50)); // Assume full flight of coin jobs: 25% bonus
    const payout = coinValue * plane!.capacity;

    const speed = Math.round(plane.speed * (1 + upgradeSpeed / 20));
    const weight = Math.round(plane.weight * (1 - upgradeWeight / 20) * 10) / 10;

    const totalDistance = distances.reduce((a, e) => a + e) / 4;
    const loss = Math.floor(totalDistance * (speed * weight / 400));
    const profit = payout - loss;

    const flightTimeSeconds = totalDistance * 700 / speed;
    const hours = Math.floor(flightTimeSeconds / 3600);
    const remainingMinutes = Math.floor((flightTimeSeconds - hours * 3600) / 60);

    const profitPerHour = profit * 3600 / flightTimeSeconds; // Divided by hours but without Math.floor()
    const longestLeg = distances.reduce((a, e) => e > a ? e : a);

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Flight stats')
      .setDescription(`The **${plane.name}** is a valid plane for the path of\n**${cities.map(city => city!.name).join('** → **')}**`)
      .addFields(
        { name: 'Profit', value: `${profit}`, inline: true },
        { name: 'Gain / Loss', value: `${payout} / ${loss}`, inline: true },
        { name: 'Profit per Hour', value: profitPerHour.toFixed(2), inline: true }
      )
      .addFields(
        { name: 'Total Distance', value: `${totalDistance * 4}`, inline: true }, // Redo the factor of 4
        { name: 'Longest Leg', value: `${longestLeg}`, inline: true },
        { name: 'Flight Time', value: `${hours !== 0 ? `${hours}h ` : ''}${remainingMinutes}min`, inline: true }
      )
      .addFields(
        { name: `Range (${upgradeRange})`, value: `${range}`, inline: true },
        { name: `Speed (${upgradeSpeed})`, value: `${speed}`, inline: true },
        { name: `Weight (${upgradeWeight})`, value: weight.toFixed(1), inline: true }
      )
      .setFooter({ text: 'Calculated assuming a full flight of coin jobs.' });
    interaction.reply({ embeds: [embed] });
  }

  async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused().replace(/[\s\.'-]+/g, '').toLowerCase();
    const options: Array<{ name: string, value: string }> = [];
    for (const [name, plane] of this.client.pocketPlanes.planes) {
      if (name.includes(focusedValue)) {
        options.push({ name: plane.name, value: name });
      }
    }
    await interaction.respond(options.length < 26 ? options : []);
  }
}