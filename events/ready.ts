import { Events } from 'discord.js';
import Bot from '../bot/bot';
import ClientEvent from '../bot/event';

export default class Ready extends ClientEvent {
  constructor() {
    super(Events.ClientReady, true);
  }

  execute(client: Bot): void {
    console.log(`Ready! Logged in as ${client.user!.tag}`);
  }
}