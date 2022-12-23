import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

export default class RollHunt extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandSubcommandBuilder()
      .setName('rollhunt')
      .setDescription('Roll a hunt with a random target and random weapons')
      .addIntegerOption(option => option
        .setName('hunter-count')
        .setDescription('The number of hunters to partake in the quest. (Defaults to 1)')
        .setMinValue(1)
        .setMaxValue(4)
      )
      .addBooleanOption(option => option
        .setName('endgame-only')
        .setDescription('Limit random monster to endgame fun hunts :)'));
    super(data, client, { belongsTo: 'mhw' });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const hunterCount = interaction.options.getInteger('hunter-count') ?? 1;
    const endgameOnly = interaction.options.getBoolean('endgame-only') ?? false;

    const random = (n: number) => Math.floor(Math.random() * n);

    const weapons = [
      'Greatsword',
      'Longsword',
      'Sword and Shield',
      'Dual Blades',
      'Hammer',
      'Hunting Horn',
      'Lance',
      'Gunlance',
      'Switch Axe',
      'Charge Blade',
      'Insect Glaive',
      'Light Bowgun',
      'Heavy Bowgun',
      'Bow'
    ];

    const endgameKeys = [
      'alatreon',
      'fatalis',
      'furiousrajang',
      'goldrathian',
      'kulvetaroth',
      'lunastra',
      'ragingbrachydios',
      'ruinernergigante',
      'safijiiva',
      'silverrathalos',
      'velkhana'
    ];

    const monsters = this.client.mhw.monsters;
    const keys = endgameOnly ? endgameKeys : [...monsters.keys()];

    const randomKey = keys[random(keys.length)];
    const randomMonster = monsters.get(randomKey)!;

    const thumbnail = new AttachmentBuilder(
      randomMonster.icon_filepath,
      { name: randomMonster.icon_filepath.slice(randomMonster.icon_filepath.lastIndexOf('/') + 1).replace(/[',\s-]/g, '') }
    );

    const embed = new EmbedBuilder()
      .setColor('#8fde5d')
      .setTitle('Rolled Hunt')
      .addFields({ name: 'Monster', value: randomMonster.title })
      .setThumbnail(`attachment://${thumbnail.name!}`);

    if (hunterCount === 1) {
      embed.addFields({ name: 'Weapon', value: weapons[random(14)] });
    }
    else {
      const weps: Array<string> = [];
      for (let i = 0; i < hunterCount; i++) {
        weps.push(`Hunter ${i + 1}: ${weapons[random(14)] }`);
      }
      embed.addFields({ name: 'Weapons', value: weps.join('\n') });
    }

    interaction.reply({ embeds: [embed], files: [thumbnail] });
  }
}