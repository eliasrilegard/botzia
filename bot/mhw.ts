import * as monsterData from '../database/monster_hunter/monster_data/mhw_monster_data.json';

interface HzvSummary {
  readonly slash: string;
  readonly blunt: string;
  readonly shot: string;
  readonly fire: string;
  readonly water: string;
  readonly thunder: string;
  readonly ice: string;
  readonly dragon: string;
}

interface MonsterDetails {
  readonly aliases: Array<string>;
  readonly title: string;
  readonly url: string;
  readonly description: string;
  readonly thumbnail: string;
  readonly elements: Array<string>;
  readonly ailments: Array<string>;
  readonly locations: Array<{
    readonly name: string;
    readonly color: string;
    readonly icon?: string;
    readonly tempered?: boolean;
  }>;
  readonly info: string;
  readonly hzv: HzvSummary;
  readonly hzv_hr?: HzvSummary;
  readonly species: string;
  readonly useful_info: string;
  readonly resistances: Array<string>;
  readonly weakness: Array<string>;
  readonly hzv_filepath: string;
  readonly hzv_filepath_hr?: string;
  readonly icon_filepath: string;
  readonly threat_level?: string;
}

export default class MhwClient {
  readonly monsters: Map<string, MonsterDetails>;

  constructor() {
    this.monsters = new Map();
    for (const [, monster] of Object.entries(monsterData)) this.monsters.set(monster.name, monster.details);
  }
}