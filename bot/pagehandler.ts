import { GuildChannel, Message, MessageEmbed, MessageReaction, User } from 'discord.js';

interface PageReactions {
  first: string;
  back: string;
  next: string;
  last: string;
  stop: string;
}

export default class PageHandler {
  private readonly message: Message;
  private readonly pages: Array<MessageEmbed>;
  private readonly time: number;
  private readonly reactions: PageReactions;
  private pagerMessage: Message;
  private page: number;

  constructor(
    message: Message,
    pages: Array<MessageEmbed>,
    time = 120000,
    footerEnabled = false,
    reactions: PageReactions = { first: '⏪', back: '◀️', next: '▶️', last: '⏩', stop: '⏹️' }
  ) {
    this.message = message;
    this.pages = pages;
    this.time = time;
    this.reactions = reactions;
    this.page = 1;

    // Only add page numbers when it's enabled if there are multiple pages
    if (footerEnabled && pages.length > 1) this.displayPageNumbers();

    let isPermissionsMissing = false;
    if (!(message.channel as GuildChannel).permissionsFor(message.member.guild.me).has(['MANAGE_MESSAGES', 'ADD_REACTIONS'])) {
      const checkPermissions = '💡 *I don\'t have* **MANAGE MESSAGES** *and/or* **ADD REACTIONS** *permissions!*';
      isPermissionsMissing = true;
      this.pages[0].setDescription(checkPermissions);
    }

    this.init(isPermissionsMissing); // Make this method and remove this line?
  }

  private displayPageNumbers(): void {
    for (let i = 0; i < this.pages.length; i++) {
      this.pages[i].setFooter({
        text: `Page ${i + 1} / ${this.pages.length}`,
        iconURL: this.message.channel.client.user.avatarURL()
      });
    }
  }

  private async init(isPermissionsMissing: boolean): Promise<void> {
    this.pagerMessage = await this.message.channel.send({ embeds: [this.pages[0]] });
    if (!isPermissionsMissing) {
      this.addReactions();
      this.createCollector();
    }
  }

  private addReactions(): void {
    for (const key in this.reactions) this.pagerMessage.react(this.reactions[key]);
  }

  private createCollector(): void {
    const collector = this.pagerMessage.createReactionCollector({
      filter: (_: MessageReaction, user: User) => user.id === this.message.author.id,
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
      reaction.users.remove(this.message.author.id);
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