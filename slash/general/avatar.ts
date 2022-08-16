import { getColorFromURL } from 'color-thief-node';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Avatar extends SlashCommand {
  constructor(client?: Bot) {
    const data = new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get the avatar of a user')
      .addUserOption(option => option
        .setName('user')
        .setDescription('The user of interest')
        .setRequired(true)
      );
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser('user');

    const avatarUrl = user.displayAvatarURL();
    const requestUrl = avatarUrl.endsWith('.webp') ? avatarUrl.slice(0, -4).concat('png') : avatarUrl;
    const dominantColor = await getColorFromURL(requestUrl, 1);

    const embed = new EmbedBuilder()
      .setColor(dominantColor)
      .setDescription(`Dominant color: #${this.hexify(dominantColor)}`)
      .setAuthor({ name: user.tag, iconURL: requestUrl })
      .setImage(requestUrl.concat('?size=4096'));
    interaction.reply({ embeds: [embed] });
  }

  private hexify(rgb: Array<number>): string {
    return rgb.reduce((result, val) => result + val.toString(16).padStart(2, '0'), '');
  }
}