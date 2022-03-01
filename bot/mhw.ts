import * as monsterData from '../database/monster_hunter/monster_data/mhw_monster_data.json';

interface HzvSummary {
  slash: string;
  blunt: string;
  shot: string;
  fire: string;
  water: string;
  thunder: string;
  ice: string;
  dragon: string;
}

interface MonsterDetails {
  aliases: Array<string>;
  title: string;
  url: string;
  description: string;
  thumbnail: string;
  elements: Array<string>;
  ailments: Array<string>;
  locations: Array<{
    name: string;
    color: string;
    icon?: string;
    tempered?: boolean;
  }>;
  info: string;
  hzv: HzvSummary;
  hzv_hr?: HzvSummary;
  species: string;
  useful_info: string;
  resistances: Array<string>;
  weakness: Array<string>;
  hzv_filepath: string;
  hzv_filepath_hr?: string;
  icon_filepath: string;
  threat_level?: string;
}

class MhwClient {
  public monsters: Map<string, MonsterDetails>;

  public constructor() {
    this.monsters = new Map();
    for (const [, monster] of Object.entries(monsterData)) this.monsters.set(monster.name, monster.details);
  }
}

export default MhwClient;