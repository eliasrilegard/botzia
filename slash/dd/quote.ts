import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Quote extends SlashCommand {
  constructor(client?: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('quote')
      .setDescription('Post a legendary quote from the DD community')
      .addStringOption(option => option
        .setName('quote')
        .setDescription('The quote to post')
        .addChoices(
          { name: 'cheating', value: 'plane_cheating' },
          { name: 'faking', value: 'thales_faking_traces' },
          { name: 'possible', value: 'lolz_possible' },
          { name: 'post', value: 'nyman_post' },
          { name: 'trash', value: 'jeol_trash' },
          { name: 'ups', value: 'moose_ups' },
          { name: 'verylucky', value: 'washboard_tol' }
        )
        .setRequired(true)
      );
    super(data, client, { belongsTo: 'dd' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const key = interaction.options.getString('quote');
    const filepath = `./database/dungeon_defenders/quotes/img/${key}.png`;
    
    const quoteImage = new AttachmentBuilder(
      filepath,
      { name: filepath.slice(filepath.lastIndexOf('/') + 1).replace(/[',\s-]/g, '') } // See mhw/hzv
    );
    interaction.reply({ files: [quoteImage] });
  }
}