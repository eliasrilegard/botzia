import { SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

import planeData from '../../database/pocket_planes/planes.json';
import cityData from '../../database/pocket_planes/cities.json';

interface Plane {
  readonly name: string;
  readonly special: boolean;
  readonly level?: number;
  readonly class: number;
  readonly capacity: number;
  readonly range: number;
  readonly speed: number;
  readonly weight: number;
  readonly cost: number;
  readonly fullCost?: number;
}

export interface City {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly class: number;
  readonly population: number,
}

export class PocketPlanesClient {
  readonly planes: Map<string, Plane> = new Map();
  readonly cities: Map<string, City> = new Map();
  
  constructor() {
    for (const [, plane] of Object.entries(planeData)) {
      const name = plane.name.replace(/[\s\.'-]+/g, '').toLowerCase();
      this.planes.set(name, plane);
    }

    for (const [, city] of Object.entries(cityData)) {
      const name = city.name.replace(/[\s\.'-]+/g, '').toLowerCase();
      this.cities.set(name, city);
    }
  }
}

export default class PocketPlanes extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('pp')
      .setDescription('Pocket Planes');
    super(data, client, { isCategory: true });
  }
}