import Bot from '../../bot/bot';
import Command from '../../bot/command';

export default class Mhw extends Command {
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