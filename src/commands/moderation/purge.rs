use regex::{Regex, RegexBuilder};
use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::futures::StreamExt;
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::model::prelude::{Message, MessageId};
use serenity::model::Permissions;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Purge;

#[async_trait]
impl SlashCommand for Purge {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    command
      .name("purge")
      .description("Delete messages")
      .dm_permission(false)
      .default_member_permissions(Permissions::MANAGE_MESSAGES)
      .create_option(|option| {
        option
          .kind(CommandOptionType::Integer)
          .name("count")
          .description("The number of messages to delete/scan (max 1000)")
          .min_int_value(2)
          .max_int_value(1000)
          .required(true)
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::Integer)
          .name("after")
          .description("Only delete messages after a specific message (id)")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::Boolean)
          .name("bots-only")
          .description("Only delete messages sent by bots")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::Boolean)
          .name("humans-only")
          .description("Only delete messages sent by humans")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::Boolean)
          .name("has-embed")
          .description("Only delete messages containing embeds")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::Boolean)
          .name("has-image")
          .description("Only delete messages containing images")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::Boolean)
          .name("has-link")
          .description("Only delete messages containing links")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::Boolean)
          .name("has-mentions")
          .description("Only delete messages containing user @mentions")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::User)
          .name("from-user")
          .description("Only delete messages sent by this user")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("exact")
          .description("Only delete messages containing exactly this text")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("starts-with")
          .description("Only delete messages starting with this text")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("ends-with")
          .description("Only delete messages ending with this text")
      })
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    // Can bot delete messages?
    if let Ok(perms) = ctx
      .cache
      .guild_channel(interaction.channel_id)
      .unwrap()
      .permissions_for_user(&ctx.cache, ctx.cache.current_user_id())
    {
      if !perms.contains(Permissions::MANAGE_MESSAGES) {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::Red)
          .title("Insufficient permissions")
          .description("I'm missing permissions to delete messages.");

        interaction
          .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
          .await?;
        return Ok(());
      }
    }

    let count = interaction.get_integer("count").unwrap() as usize;

    let bots_only = interaction.get_bool("bots-only").unwrap_or(false);
    let humans_only = interaction.get_bool("humans-only").unwrap_or(false);
    let must_have_embed = interaction.get_bool("has-embed").unwrap_or(false);
    let must_have_image = interaction.get_bool("has-image").unwrap_or(false);
    let must_have_link = interaction.get_bool("has-link").unwrap_or(false);
    let must_have_mention = interaction.get_bool("has-mention").unwrap_or(false);

    let after = interaction.get_integer("after").unwrap_or(0) as u64;

    let from_author_id = if let Some((user, _)) = interaction.get_user("from-user") {
      user.id.0
    } else {
      0
    };

    let exact = interaction.get_string("exact").unwrap_or("".to_string());
    let beginning = interaction.get_string("starts_with").unwrap_or("".to_string());
    let ending = interaction.get_string("ends_with").unwrap_or("".to_string());

    let mut embed = CreateEmbed::default();
    embed.color(Colors::Blue).title("Working...");

    interaction
      .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
      .await?;

    if count <= 100
      && !bots_only
      && !humans_only
      && !must_have_embed
      && !must_have_image
      && !must_have_link
      && !must_have_mention
      && after == 0
      && from_author_id == 0
      && exact.is_empty()
      && beginning.is_empty()
      && ending.is_empty()
    {
      let mut message_ids: Vec<MessageId> = vec![];
      let mut messages = interaction.channel_id.messages_iter(&ctx.http).boxed();

      while let Some(message_result) = messages.next().await {
        match message_result {
          Ok(message) => message_ids.push(message.id),
          Err(_) => break
        }
        if message_ids.len() == count {
          break;
        }
      }

      let mut embed = CreateEmbed::default();
      if let Err(why) = interaction.channel_id.delete_messages(&ctx.http, &message_ids).await {
        embed
          .color(Colors::Red)
          .title("Couldn't delete messages")
          .field("Error", why.to_string(), false);
      } else {
        embed
          .color(Colors::Green)
          .title("Success")
          .description(format!("Successfully deleted {} messages.", message_ids.len()));
      }

      interaction
        .edit_original_interaction_response(&ctx.http, |msg| msg.set_embed(embed))
        .await?;
    } else {
      // Custom purge
      let re_mention = Regex::new(r"<@!?\d{15,20}>").unwrap();
      let re_link = RegexBuilder::new(
        r"[(http(s)?)://(www\.)?a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&/=]*)"
      )
      .case_insensitive(true)
      .build()
      .unwrap();

      let can_delete = |msg: &Message| -> bool {
        let content = msg.content.to_ascii_lowercase();
        !(
          (bots_only              && !msg.author.bot                    ) || // Only from bots and author is human
          (humans_only            && msg.author.bot                     ) || // Only from humans and author is bot
          (must_have_embed        && msg.embeds.is_empty()              ) || // Only contains embeds and no embeds
          (must_have_image        && msg.attachments.is_empty()         ) || // Only contains images and no images
          (must_have_link         && !re_link.is_match(&msg.content)    ) || // Only contains links and no links
          (must_have_mention      && !re_mention.is_match(&msg.content) ) || // Only contains mentions and no mentions
          (from_author_id != 0    && msg.author.id != from_author_id    ) || // Only from specific id and different id
          (!exact.is_empty()      && content != exact                   ) || // Only exact phrase and content is different
          (!beginning.is_empty()  && !content.starts_with(&beginning)   ) || // Only starts with phrase and doesn't
          (!ending.is_empty()     && !content.ends_with(&ending)        )
          // Only ends with phrase and doesn't
        )
      };

      let mut messages = interaction.channel_id.messages_iter(&ctx.http).boxed();
      let mut deleted = 0;
      let mut total = 0;

      while let Some(message_result) = messages.next().await {
        match message_result {
          Ok(message) => {
            if message.id.0 < after {
              break;
            }

            if can_delete(&message) {
              message.delete(&ctx.http).await?;
              deleted += 1;
            }
          }

          Err(why) => {
            let mut embed = CreateEmbed::default();
            embed
              .color(Colors::Red)
              .title("Couldn't delete message(s)")
              .field("Error", why, false);
            interaction
              .edit_original_interaction_response(&ctx.http, |msg| msg.set_embed(embed))
              .await?;
            return Ok(());
          }
        }

        total += 1;
        if deleted >= count || total > 10_000 {
          break;
        }
      }

      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Green)
        .title("Success")
        .description(format!("Sucessfully deleted {} messages.", deleted));

      interaction
        .edit_original_interaction_response(&ctx.http, |msg| msg.set_embed(embed))
        .await?;
    }

    Ok(())
  }
}
