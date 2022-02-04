import { Client } from 'discord.js';
import ClientEvent from '../bot/event';

class Ready extends ClientEvent {
  public constructor() {
    super('ready', true);
  }

  public execute(client: Client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
  }
}

export default Ready;