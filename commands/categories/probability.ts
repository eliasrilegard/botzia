import { SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Probability extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('probability')
      .setDescription('Probability commands');
    super(data, client, { isCategory: true });
  }
}