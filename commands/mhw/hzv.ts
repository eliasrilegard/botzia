import { AttachmentBuilder, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class Hzv extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('hzv')
      .setDescription('Get the HZV (Hitzone Value) of a specified monster')
      .addStringOption(option => option
        .setName('monster')
        .setDescription('The monster for whom to find their HZV')
        .setAutocomplete(true)
        .setRequired(true)
      )
      .addBooleanOption(option => option
        .setName('hr')
        .setDescription('Get HR hitzones in the case that both HR and MR (default) exists')
      );
    super(data, client, { belongsTo: 'mhw' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const input = interaction.options.getString('monster')!.replace(/\s+/g, '').toLowerCase();
    const isHR = interaction.options.getBoolean('hr') ?? false;
    let monsterName = input.startsWith('hr') ? input.slice(2) : input;

    if (this.client.mhw.monsters == null) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Monster data unavailable')
        .setDescription('Could not access monster data at this time.')
        .setFooter({ text: `If this issue persists please contact ${this.client.config.users.chrono_tag}` });
      interaction.reply({ embeds: [embed] });
      return;
    }

    for (const [name, monster] of this.client.mhw.monsters.entries()) {
      if (input.length > 0 && monster.aliases.includes(input)) {
        monsterName = name;
        break;
      }
    }

    const monster = this.client.mhw.monsters.get(monsterName);

    if (!monster) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Monster not found')
        .setDescription('That monster doesn\'t seem to exist!\nCheck out `/mhw list` for the full list.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (isHR && !('hzv_filepath_hr' in monster && 'hzv_hr' in monster)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('High rank hitzones not found')
        .setDescription('Could not locate the HR HZV. If the monster only exists in high rank, omit specifying this option.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    const hzvFilepath = isHR ? monster.hzv_filepath_hr! : monster.hzv_filepath;
    const hzv = isHR ? monster.hzv_hr! : monster.hzv;

    // Get file name by cutting off everything before and including the last '/'
    // Clean up file name by removing characters that will mess with Discord's API
    const thumbnail = new AttachmentBuilder(
      monster.icon_filepath,
      { name: monster.icon_filepath.slice(monster.icon_filepath.lastIndexOf('/') + 1).replace(/[',\s-]/g, '') }
    );
    const hzvImage = new AttachmentBuilder(
      hzvFilepath,
      { name: hzvFilepath.slice(hzvFilepath.lastIndexOf('/') + 1).replace(/[',\s-]/g, '') }
    );

    const attachURL = (fileName: string) => `attachment://${fileName}`;
    
    const embed = new EmbedBuilder()
      .setColor('#8fde5d')
      .setTitle(`__**${monster.title}**__${monster.threat_level ? `  ${monster.threat_level}` : ''}`)
      .setThumbnail(attachURL(thumbnail.name!))
      .setImage(attachURL(hzvImage.name!))
      .addFields([
        { name: 'Classification', value: monster.species },
        { name: 'Characteristics', value: monster.description },
        {
          name: `Slash: **${hzv.slash}** Blunt: **${hzv.blunt}** Shot: **${hzv.shot}**`,
          value: `🔥 **${hzv.fire}** 💧 **${hzv.water}** ⚡ **${hzv.thunder}** ❄ **${hzv.ice}** 🐉 **${hzv.dragon}**`
        }
      ]);
    interaction.reply({ embeds: [embed], files: [thumbnail, hzvImage] });
  }

  async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused().toLowerCase().replace(/\s+/g, '');
    const options: Array<{ name: string, value: string }> = [];
    for (const [name, details] of this.client.mhw.monsters.entries()) {
      if ([name, ...details.aliases].some(identifier => identifier.includes(focusedValue))) {
        options.push({ name: details.title, value: name });
      }
    }
    await interaction.respond(options.length < 26 ? options : []);
  }
}