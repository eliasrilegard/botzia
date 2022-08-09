import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class DD extends Command {
  constructor(client: Bot) {
    super(
      client,
      'dd',
      'Dungeon Defenders',
      ['[command] [arguments]'],
      { category: true }
    );
  }
}