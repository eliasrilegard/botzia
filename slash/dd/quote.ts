import { AttachmentBuilder, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Quote extends SlashCommand {
  private readonly quoteMap: Map<string, string>;

  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('quote')
      .setDescription('Post a legendary quote from the DD community')
      .addStringOption(option => option
        .setName('quote')
        .setDescription('The quote to post')
        .setAutocomplete(true)
        .setRequired(true)
      );
    super(data, client, { belongsTo: 'dd' });

    this.quoteMap = new Map();
    this.loadQuotes();
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const key = interaction.options.getString('quote')!;
    const filepath = this.quoteMap.get(key);

    if (!filepath) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Quote not found')
        .setDescription('Could not identify the quote.');
      interaction.reply({ embeds: [embed] });
      return;
    }
    
    const quoteImage = new AttachmentBuilder(
      filepath,
      { name: filepath.slice(filepath.lastIndexOf('/') + 1).replace(/[',\s-]/g, '') } // See mhw/hzv
    );
    interaction.reply({ files: [quoteImage] });
  }

  async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused().toLowerCase().replace(/\s+/g, '');
    const options: Array<{ name: string, value: string }> = [];
    for (const key of this.quoteMap.keys()) {
      if (key && key.includes(focusedValue)) options.push({ name: key, value: key });
    }
    await interaction.respond(options.length < 26 ? options : []);
  }

  private async loadQuotes(): Promise<void> {
    delete require.cache[require.resolve('../../database/dungeon_defenders/quotes/quotemap.json')];
    const { default: quoteData } = await import('../../database/dungeon_defenders/quotes/quotemap.json');
    for (const [, v] of Object.entries(quoteData)) {
      this.quoteMap.set(v.name, v.filepath);
    }
  }
}