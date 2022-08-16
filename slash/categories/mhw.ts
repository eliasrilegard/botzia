import { SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Mhw extends SlashCommand {
  constructor(client?: Bot) {
    const data = new SlashCommandBuilder()
      .setName('mhw')
      .setDescription('Monster Hunter World: Iceborne');
    super(data, client, { isCategory: true });
  }
}