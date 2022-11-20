import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Mhw extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'mhw',
      'Monster Hunter World: Iceborne',
      ['[command] [arguments]'],
      { category: true }
    );
  }
}