use std::time::Duration;

use serenity::async_trait;
use serenity::builder::CreateEmbed;
use serenity::futures::StreamExt;
use serenity::model::prelude::application_command::ApplicationCommandInteraction;
use serenity::model::prelude::ReactionType;
use serenity::model::Permissions;
use serenity::prelude::Context;

use super::BetterResponse;
use crate::color::Colors;
use crate::Result;

#[async_trait]
pub(crate) trait InteractiveMenu {
  /// Footers will be overwritten!
  async fn send_menu(&self, ctx: &Context, embeds: Vec<CreateEmbed>) -> Result<()>;
}

#[async_trait]
impl InteractiveMenu for ApplicationCommandInteraction {
  async fn send_menu(&self, ctx: &Context, mut embeds: Vec<CreateEmbed>) -> Result<()> {
    let embeds_count = embeds.len();
    for (i, embed) in embeds.iter_mut().enumerate() {
      embed.footer(|footer| footer.text(format!("Page {} / {}", i + 1, embeds_count)));
    }

    if let Some(id) = self.guild_id {
      let guild = id.to_guild_cached(&ctx.cache).unwrap();
      if let Ok(permissions) = guild.member_permissions(&ctx.http, ctx.cache.current_user_id()).await {
        if !permissions.contains(Permissions::ADD_REACTIONS | Permissions::MANAGE_MESSAGES) {
          let mut embed = CreateEmbed::default();
          embed
            .color(Colors::Red)
            .title("Insufficient permissions")
            .description("I don't have permissions to **MANAGE MESSAGES** and/or **ADD REACTIONS**!");

          self
            .reply(&ctx.http, |msg| msg.set_embeds(vec![embeds[0].clone(), embed]))
            .await?;
          return Ok(());
        }
      }
    }

    self.reply(&ctx.http, |msg| msg.set_embed(embeds[0].clone())).await?;
    let mut message = self.get_interaction_response(&ctx.http).await?;

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
      .build();

    let mut page = 0;
    while let Some(action) = collector.next().await {
      let reaction = action.as_inner_ref();
      let emote = reaction.emoji.to_string();

      match emote.as_str() {
        "⏪" => {
          page = 0;
          message
            .edit(&ctx.http, |msg| msg.set_embed(embeds[page].clone()))
            .await?;
        }
        "◀️" => {
          page = (page - 1).max(0);
          message
            .edit(&ctx.http, |msg| msg.set_embed(embeds[page].clone()))
            .await?;
        }
        "▶️" => {
          page = (page + 1).min(embeds_count - 1);
          message
            .edit(&ctx.http, |msg| msg.set_embed(embeds[page].clone()))
            .await?;
        }
        "⏩" => {
          page = embeds_count - 1;
          message
            .edit(&ctx.http, |msg| msg.set_embed(embeds[page].clone()))
            .await?;
        }
        "⏹️" => {
          message.delete_reactions(&ctx.http).await?;
          break;
        }
        _ => ()
      }

      reaction.delete(&ctx.http).await?;
    }
    collector.stop();

    Ok(())
  }
}
