import Bot from '../bot/bot';
import ClientEvent from '../bot/event';

class Ready extends ClientEvent {
  public constructor() {
    super('ready', true);
  }

  public execute(client: Bot) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
  }
}

export default Ready;