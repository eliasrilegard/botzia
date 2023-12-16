use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommand, CreateCommandOption, CreateEmbed};
use serenity::client::Context;
use serenity::model::prelude::ChannelType;
use serenity::model::Permissions;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct MassMove;

#[async_trait]
impl SlashCommand for MassMove {
  fn register(&self) -> CreateCommand {
    CreateCommand::new("massmove")
      .description("Move all members to a specified channel")
      .dm_permission(false)
      .default_member_permissions(Permissions::MOVE_MEMBERS)
      .add_option(
        CreateCommandOption::new(
          CommandOptionType::Channel,
          "target-channel",
          "The channel to move everybody to"
        )
        .channel_types(vec![ChannelType::Voice, ChannelType::Stage])
        .required(true)
      )
      .add_option(
        CreateCommandOption::new(
          CommandOptionType::Channel,
          "source-channel",
          "The channel to move everybody from"
        )
        .channel_types(vec![ChannelType::Voice, ChannelType::Stage])
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let destination_id = interaction.get_channel_id("target-channel").unwrap();
    let guild_id = interaction.guild_id.unwrap();

    let origin_id = match interaction.get_channel_id("source-channel").or({
      let guild = guild_id.to_guild_cached(ctx).unwrap();
      guild.voice_states.get(&interaction.user.id).and_then(|state| state.channel_id)
    }) {
      Some(channel_id) => channel_id,
      None => {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Unknown base channel")
          .description("Unless you're in a voice channel, you need to specify both the base and target channels.");

        interaction.reply_embed(&ctx.http, embed).await?;
        return Ok(());
      }
    };

    // Checks
    let bot_member = guild_id.current_user_member(ctx).await?;
    if !bot_member.permissions(ctx).unwrap().contains(Permissions::MOVE_MEMBERS) {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Insuficcient permissions")
        .description("I don't have permission to move members in this server");

      interaction.reply_embed_ephemeral(ctx, embed).await?;
      return Ok(());
    }

    if origin_id == destination_id {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Nothing to move")
        .description("I can't move members from and to the same channel.");

      interaction.reply_embed(&ctx.http, embed).await?;
      return Ok(());
    }

    let members = {
      let guild = guild_id.to_guild_cached(ctx).unwrap();
      let channel = guild.channels.get(&origin_id).unwrap();
      channel.members(ctx).unwrap()
    };

    if members.is_empty() {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Nobody to move")
        .description("There is nobody in the channel to move from.");

      interaction.reply_embed(&ctx.http, embed).await?;
      return Ok(());
    }

    for member in members {
      member.move_to_voice_channel(ctx, destination_id).await?;
    }

    let embed = CreateEmbed::new()
      .color(Colors::Green)
      .title("Success")
      .description(format!(
        "Successfully moved everybody to {}",
        destination_id.name(ctx).await?
      ));

    interaction.reply_embed(&ctx.http, embed).await?;
    Ok(())
  }
}
