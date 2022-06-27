import Bot from '../bot/bot';
import ClientEvent from '../bot/event';

export default class Ready extends ClientEvent {
  constructor() {
    super('ready', true);
  }

  execute(client: Bot) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
  }
}