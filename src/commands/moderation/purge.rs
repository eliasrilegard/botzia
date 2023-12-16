use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommand, CreateCommandOption, CreateEmbed, GetMessages};
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
  fn register(&self) -> CreateCommand {
    CreateCommand::new("purge")
      .description("Delete messages")
      .dm_permission(false)
      .default_member_permissions(Permissions::MANAGE_MESSAGES)
      .add_option(
        CreateCommandOption::new(
          CommandOptionType::Integer,
          "count",
          "The number of messages to delete/scan (max 100)"
        )
        .min_int_value(2)
        .max_int_value(100)
        .required(true)
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let guild_channel = interaction.channel_id.to_channel(ctx).await?.guild().unwrap();

    let bot_permissions = guild_channel
      .permissions_for_user(ctx, ctx.cache.current_user().id)
      .unwrap();
    if !bot_permissions.contains(Permissions::MANAGE_MESSAGES) {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Insuficcient permissions")
        .description("I don't have permission to **MANAGE MESSAGES**");

      interaction.reply_embed_ephemeral(ctx, embed).await?;
      return Ok(());
    }

    let limit = interaction.get_number("count").unwrap() as u8;
    let messages = interaction
      .channel_id
      .messages(ctx, GetMessages::new().limit(limit))
      .await?;
    let amount = messages.len();

    let embed = match interaction.channel_id.delete_messages(ctx, messages).await {
      Ok(_) => CreateEmbed::new()
        .color(Colors::Green)
        .title("Success")
        .description(format!("Successfully deleted {amount} messages.")),

      Err(why) => CreateEmbed::new()
        .color(Colors::Red)
        .title("Couldn't delete messages")
        .field("Error", why.to_string(), false)
    };

    interaction.reply_embed_ephemeral(ctx, embed).await?;
    Ok(())
  }
}
