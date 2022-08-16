import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class DD extends TextCommand {
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