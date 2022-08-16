import { ChatInputCommandInteraction, EmbedBuilder, GuildTextBasedChannel, Message, MessageReaction, User } from 'discord.js';

interface PageReactions {
  first: string;
  back: string;
  next: string;
  last: string;
  stop: string;
}

export default class PageHandler {
  private page: number;
  private pagerMessage: Message;

  constructor(
    private readonly interaction: ChatInputCommandInteraction | Message,
    private readonly pages: Array<EmbedBuilder>,
    private readonly time = 120_000,
    footerEnabled = false,
    private readonly reactions: PageReactions = { first: '⏪', back: '◀️', next: '▶️', last: '⏩', stop: '⏹️' }
  ) {
    this.page = 1;

    if (footerEnabled && this.pages.length > 1) this.displayPageNumbers();

    if (!(interaction.channel as GuildTextBasedChannel).permissionsFor(interaction.guild.members.me).has(['ManageMessages', 'AddReactions'])) {
      this.pages[0].setDescription('*I don\'t have* **MANAGE MESSAGES** *and/or* **ADD REACTIONS** *permissions!*');
      interaction.reply({ embeds: [this.pages[0]] });
      return;
    }

    this.init();
  }

  private displayPageNumbers(): void {
    for (let i = 0; i < this.pages.length; i++) this.pages[i].setFooter({ text: `Page ${i + 1} / ${this.pages.length}` });
  }

  private async init(): Promise<void> {
    this.pagerMessage = await this.interaction.reply({ embeds: [this.pages[0]], fetchReply: true });
    this.addReactions();
    this.createCollector();
  }

  private addReactions(): void {
    for (const key in this.reactions) this.pagerMessage.react(this.reactions[key]);
  }

  private createCollector(): void {
    const userId = this.interaction instanceof ChatInputCommandInteraction ? this.interaction.user.id : this.interaction.author.id;

    const collector = this.pagerMessage.createReactionCollector({
      filter: (_: MessageReaction, user: User) => {
        return user.id === userId;
      },
      time: this.time
    });

    collector.on('collect', reaction => {
      switch (reaction.emoji.name) {
        case this.reactions.first:
          if (this.page !== 1) this.select(1);
          break;
        case this.reactions.back:
          if (this.page !== 1) this.select(this.page - 1);
          break;
        case this.reactions.next:
          if (this.page !== this.pages.length) this.select(this.page + 1);
          break;
        case this.reactions.last:
          if (this.page !== this.pages.length) this.select(this.pages.length);
          break;
        case this.reactions.stop:
          collector.stop();
          break;
      }
      reaction.users.remove(userId);
    });

    collector.on('end', () => this.pagerMessage.reactions.removeAll());
  }

  private select(pg = 1): void {
    this.page = pg;
    this.pagerMessage.edit({ embeds: [this.pages[pg - 1]] });
  }

  delete(): void {
    this.pagerMessage.delete();
  }
}