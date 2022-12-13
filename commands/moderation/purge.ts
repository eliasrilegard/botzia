import { BaseGuildTextChannel, ChatInputCommandInteraction, EmbedBuilder, FetchMessagesOptions, PermissionFlagsBits, SlashCommandBuilder, ThreadChannel, VoiceChannel } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

type ChatChannel = BaseGuildTextChannel | ThreadChannel | VoiceChannel

export default class Purge extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Delete messages')
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(option => option
        .setName('count')
        .setDescription('The number of messages to delete. Limit 1000')
        .setMinValue(1)
        .setMaxValue(1000)
        .setRequired(true)
      )
      .addBooleanOption(option => option
        .setName('entire-server')
        .setDescription('Apply purge to ENTIRE server, not just this specific channel')
      )
      .addStringOption(option => option
        .setName('after')
        .setDescription('Only delete messages after a specific message (id)')
      )
      .addBooleanOption(option => option
        .setName('bots-only')
        .setDescription('Only delete messages sent by bots')
      )
      .addBooleanOption(option => option
        .setName('humans-only')
        .setDescription('Only delete messages sent by humans')
      )
      .addBooleanOption(option => option
        .setName('has-embed')
        .setDescription('Only delete messages containing embeds')
      )
      .addBooleanOption(option => option
        .setName('has-image')
        .setDescription('Only delete messages containing images')
      )
      .addBooleanOption(option => option
        .setName('has-link')
        .setDescription('Only delete messages containing links')
      )
      .addBooleanOption(option => option
        .setName('has-mention')
        .setDescription('Only delete messages containing user mentions')
      )
      .addUserOption(option => option
        .setName('from-user')
        .setDescription('Only delete messges sent by this user')
      )
      .addStringOption(option => option
        .setName('exact')
        .setDescription('Only delete messages containing exactly this text')
      )
      .addStringOption(option => option
        .setName('starts-with')
        .setDescription('Only delete messages starting with the given text')
      )
      .addStringOption(option => option
        .setName('ends-with')
        .setDescription('Only delete messages ending with the specified text')
      );
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const count = interaction.options.getInteger('count')!;
    const purgeAllChannels = interaction.options.getBoolean('entire-server') ?? false;
    const afterMessageId = interaction.options.getString('after');
    const botsOnly = interaction.options.getBoolean('bots-only') ?? false;
    const humansOnly = interaction.options.getBoolean('humans-only') ?? false;
    const hasEmbedsOnly = interaction.options.getBoolean('has-embeds') ?? false;
    const hasImageOnly = interaction.options.getBoolean('has-image') ?? false;
    const hasLinkOnly = interaction.options.getBoolean('has-link') ?? false;
    const hasMentionOnly = interaction.options.getBoolean('has-mention') ?? false;
    const fromAuthor = interaction.options.getUser('from-user');
    const exact = interaction.options.getString('exact');
    const msgStart = interaction.options.getString('starts-with');
    const msgEnd = interaction.options.getString('ends-with');

    // Check if we can use simple bulkDelete()
    if (
      count < 100 && !purgeAllChannels && !botsOnly && !humansOnly && !hasEmbedsOnly && !hasImageOnly &&
      !hasLinkOnly && !hasMentionOnly && [afterMessageId, fromAuthor, exact, msgStart, msgEnd].every(v => v == null)
    ) {
      try {
        const channel = interaction.channel! as ChatChannel;
        channel.bulkDelete(count);
      }
      catch (error) {
        console.log(error);
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('Error')
          .setDescription('An error was encountered while trying to delete messages.')
          .addFields({ name: 'Error message', value: error instanceof Error ? error.message : 'Error' });
        interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.GREEN)
        .setTitle('Success')
        .setDescription(`Successfully deleted ${count} messages.`);
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Custom purge

    const deferred = count > 100 || purgeAllChannels;
    if (deferred) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.BLUE)
        .setTitle('Working...');
      interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const guildChannels = await interaction.guild!.channels.fetch();
    const channels = (purgeAllChannels ?
      [...guildChannels.values()].filter(ch =>
        ch instanceof BaseGuildTextChannel ||
        ch instanceof ThreadChannel ||
        ch instanceof VoiceChannel
      ) :
      [interaction.channel!]) as Array<ChatChannel>;

    let deletedMessageTotalCount = 0;
    
    for (const channel of channels) {
      let fetchedMessageCount = 0;
      let deletedMessageCount = 0;
      
      let lastId = '';
      while (deletedMessageCount < count && fetchedMessageCount < 10_000) {
        const limit = 100;
        const options: FetchMessagesOptions = { limit: limit, cache: false };
        if (lastId) options.before = lastId;
        fetchedMessageCount += limit;
        
        const fetched = await channel.messages.fetch(options);
        const lastMsg = fetched.last();
        if (!lastMsg) break;
        lastId = lastMsg.id;

        for (const [, msg] of fetched) {
          if (afterMessageId && msg.id < afterMessageId || deletedMessageCount >= count) break;

          if ((botsOnly && !msg.author.bot) || (humansOnly && msg.author.bot)) continue;

          if (hasEmbedsOnly && msg.embeds.length === 0) continue;
          if (hasImageOnly && msg.attachments.size > 0) continue;

          if (hasLinkOnly) {
            const containsLinks = /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig.test(msg.content);
            if (!containsLinks) continue;
          }

          if (hasMentionOnly && /<@!?\d{15,20}>/ig.test(msg.content)) continue;

          if (fromAuthor && msg.author.id !== fromAuthor.id) continue;

          const content = msg.content.toLowerCase();

          if (exact && content !== exact.toLowerCase()) continue;
          if (msgStart && !content.startsWith(msgStart.toLowerCase())) continue;
          if (msgEnd && !content.endsWith(msgEnd.toLowerCase())) continue;

          msg.delete();
          deletedMessageCount++;
        }
      }
      deletedMessageTotalCount += deletedMessageCount;
    }

    const successEmbed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Success')
      .setDescription(`Successfully deleted ${deletedMessageTotalCount} messages.`);
    if (deferred) interaction.editReply({ embeds: [successEmbed] });
    else interaction.reply({ embeds: [successEmbed], ephemeral: true });
  }
}