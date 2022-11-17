import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import DWG from 'directed-weighted-graph';
import { City } from '../categories/pp';

interface Node {
  name: string;
  x: number;
  y: number;
  heuristic: number; // Distance from the goal (h)
  pathlength: number; // Path length from the start node (g)
  cameFrom?: Node;
}

export default class Pathfind extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('pathfind')
      .setDescription('Find the optimal path from one city to another')
      .addStringOption(option => option
        .setName('origin')
        .setDescription('The city to start from')
        .setAutocomplete(true)
        .setRequired(true)
      )
      .addStringOption(option => option
        .setName('destination')
        .setDescription('The target city')
        .setAutocomplete(true)
        .setRequired(true)
      )
      .addStringOption(option => option
        .setName('plane')
        .setDescription('The plane to use for the flight')
        .setAutocomplete(true)
        .setRequired(true)
      )
      .addIntegerOption(option => option
        .setName('range-upgrade')
        .setDescription('Range upgrade level to use (0-4)')
      );
    super(data, client, { belongsTo: 'pp' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const originName = interaction.options.getString('origin')!;
    const destName = interaction.options.getString('destination')!;
    const planeName = interaction.options.getString('plane')!;
    const rangeUpgrade = interaction.options.getInteger('range-upgrade') ?? 0;
    
    const cleanup = (str: string) => str.replace(/[\s\.'-]+/g, '').toLowerCase();

    const plane = this.client.pocketPlanes.planes.get(cleanup(planeName));
    
    if (!plane) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Plane not found')
        .setDescription(`**${planeName}** is not a valid plane. Check your spelling and try again.`);
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (rangeUpgrade < 0 || rangeUpgrade > 4) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Invalid range upgrade')
        .setDescription('Specify a number between **0** and **4**.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    const startCity = this.client.pocketPlanes.cities.get(cleanup(originName));
    if (!startCity) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Origin city not found')
        .setDescription(`**${startCity}** is not a valid city. Check your spelling and try again.`);
      interaction.reply({ embeds: [embed] });
      return;
    }
    
    const endCity = this.client.pocketPlanes.cities.get(destName);
    if (!endCity) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Origin city not found')
        .setDescription(`**${endCity}** is not a valid city. Check your spelling and try again.`);
      interaction.reply({ embeds: [embed] });
      return;
    }
    
    const distance = (c1: City | Node, c2: City | Node) => Math.floor(Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2))) * 4;
    
    // Build graph
    const range = Math.round(plane.range * (1 + rangeUpgrade / 20));
    const graph = new DWG<Node, number>();

    for (const [, city] of this.client.pocketPlanes.cities) {
      if (city.class >= plane.class) {
        const node: Node = {
          name: city.name,
          x: city.x,
          y: city.y,
          heuristic: distance(startCity, city),
          pathlength: Infinity
        };
        graph.addVertex(node);
      }
    }

    const vertices = graph.getAllVertices();
    for (const city1 of vertices) {
      for (const city2 of vertices) {
        const dist = distance(city1, city2);
        if (dist > 0 && dist <= range) graph.addEdge(city1, city2, dist);
      }
    }
    
    // Pathfind
    const foundPath = this.aStarSearch(graph, startCity, endCity);

    if (foundPath.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('No path found')
        .setDescription('Check your arguments.\nThis shouldn\'t ever happen, please contact Chronozia#1815 for support.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.BLUE)
      .setTitle('Shortest Path Found')
      .setDescription(`Using the **${plane.name}** with a range upgrade of **${rangeUpgrade}** (**${range}** mi.), the best path is:`)
      .addFields(
        { name: `${startCity.name} to ${endCity.name}`, value: foundPath.join(' → ') }
      );
    interaction.reply({ embeds: [embed] });
  }

  async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedOptionObj = interaction.options.getFocused(true);
    const focusedName = focusedOptionObj.name;
    const focusedValue = focusedOptionObj.value.replace(/[\s\.'-]+/g, '').toLowerCase();
    const options: Array<{ name: string, value: string }> = [];

    switch (focusedName) {
      case 'origin':
      case 'destination': {
        for (const [name, city] of this.client.pocketPlanes.cities) {
          if (name.includes(focusedValue)) {
            options.push({ name: city.name, value: name });
          }
        }
        break;
      }

      case 'plane': {
        for (const [name, plane] of this.client.pocketPlanes.planes) {
          if (name.includes(focusedValue)) {
            options.push({ name: plane.name, value: name });
          }
        }
        break;
      }
    }
    
    await interaction.respond(options.length < 26 ? options : []);
  }

  private aStarSearch(graph: DWG<Node, number>, startCity: City, endCity: City): Array<string> {
    // A* Search Algorithm

    // TODO: Rewrite openSet to a priority queue
    const openSet = graph.getAllVertices().filter(node => node.name === startCity.name);
    openSet[0].pathlength = 0;

    while (openSet.length > 0) {
      let indexLowest = 0;
      for (let i = 0; i < openSet.length; i++) {
        const iF = openSet[i].heuristic + openSet[i].pathlength;
        const lowestF = openSet[indexLowest].heuristic + openSet[indexLowest].pathlength;
        if (iF < lowestF) indexLowest = i;
      }
      const current = openSet[indexLowest];

      if (current.name === endCity.name) {
        // Target found, begin path reconstruction
        const totalPath = [current.name];
        let before = current.cameFrom;
        while (before) {
          totalPath.push(before.name);
          before = before.cameFrom;
        }
        return totalPath.reverse();
      }

      // Remove from openSet
      for (let i = openSet.length - 1; i >= 0; i--) {
        if (openSet[i] === current) {
          openSet.splice(i, 1);
        }
      }

      for (const [neighbor, dist] of graph.getEdges(current)) {
        const tentativePathlength = current.pathlength + dist;
        if (tentativePathlength < neighbor.pathlength) {
          neighbor.cameFrom = current;
          neighbor.pathlength = tentativePathlength;
          if (!openSet.includes(neighbor)) openSet.push(neighbor);
        }
      }
    }

    // Open set is empty but goal was never reached
    return [];
  }
}