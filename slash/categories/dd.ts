import { SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class DD extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('dd')
      .setDescription('Dungeon Defenders');
    super(data, client, { isCategory: true });
  }
}