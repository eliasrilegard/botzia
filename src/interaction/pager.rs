use std::time::Duration;

use serenity::all::{CommandInteraction, ReactionType};
use serenity::async_trait;
use serenity::builder::{CreateEmbed, CreateEmbedFooter, CreateInteractionResponseMessage, EditMessage};
use serenity::client::Context;
use serenity::futures::StreamExt;
use serenity::model::Permissions;

use super::BetterResponse;
use crate::color::Colors;
use crate::Result;

#[async_trait]
pub trait InteractiveMenu {
  /// An interactive message that flips through the embeds provided.
  /// Footers will be overwritten by page numbers.
  async fn send_menu(&self, ctx: &Context, embeds: Vec<CreateEmbed>) -> Result<()>;
}

#[async_trait]
impl InteractiveMenu for CommandInteraction {
  async fn send_menu(&self, ctx: &Context, embeds: Vec<CreateEmbed>) -> Result<()> {
    let embeds_count = embeds.len();
    let embeds_modified = embeds
      .into_iter()
      .enumerate()
      .map(|(i, embed)| embed.footer(CreateEmbedFooter::new(format!("Page {} / {embeds_count}", i + 1))))
      .collect::<Vec<_>>();

    if self.guild_id.is_some() {
      let guild_channel = self.channel_id.to_channel(ctx).await?.guild().unwrap();
      let permissions = guild_channel
        .permissions_for_user(ctx, ctx.cache.current_user().id)
        .unwrap();

      if !permissions.contains(Permissions::ADD_REACTIONS | Permissions::MANAGE_MESSAGES) {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Insufficient permissions")
          .description("I don't have permissions to **MANAGE MESSAGES** and/or **ADD REACTIONS**!");

        let data = CreateInteractionResponseMessage::new().embeds(vec![embeds_modified[0].clone(), embed]);
        self.reply(ctx, data).await?;
        return Ok(());
      }
    }

    self.reply_embed(ctx, embeds_modified[0].clone()).await?;
    let mut message = self.get_response(ctx).await?;

    let reactions = ["⏪", "◀️", "▶️", "⏩", "⏹️"]
      .iter()
      .map(|r| ReactionType::Unicode(r.to_string()))
      .collect::<Vec<_>>();
    for reaction in reactions {
      message.react(&ctx.http, reaction).await?;
    }

    let mut collector = message
      .await_reactions(ctx)
      .author_id(self.user.id)
      .timeout(Duration::from_secs(120))
      .stream();

    let mut page = 0;
    while let Some(reaction) = collector.next().await {
      let emote = reaction.emoji.to_string();

      match emote.as_str() {
        "⏪" => {
          page = 0;
        }
        "◀️" => {
          page = (page - 1).max(0);
        }
        "▶️" => {
          page = (page + 1).min(embeds_count - 1);
        }
        "⏩" => {
          page = embeds_count - 1;
        }
        "⏹️" => {
          message.delete_reactions(&ctx.http).await?;
          break;
        }
        _ => continue
      }

      let builder = EditMessage::new().embed(embeds_modified[page].clone());
      message.edit(ctx, builder).await?;
      reaction.delete(ctx).await?;
    }

    Ok(())
  }
}
