use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::model::prelude::ChannelType;
use serenity::model::Permissions;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct MassMove;

#[async_trait]
impl SlashCommand for MassMove {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    let channel_types = [ChannelType::Voice, ChannelType::Stage];
    command
      .name("massmove")
      .description("Move all members to a specified channel")
      .dm_permission(false)
      .default_member_permissions(Permissions::MOVE_MEMBERS)
      .create_option(|option| {
        option
          .kind(CommandOptionType::Channel)
          .name("target-channel")
          .description("The channel to move everybody to")
          .channel_types(&channel_types)
          .required(true)
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::Channel)
          .name("source-channel")
          .description("The channel to move everybody from")
          .channel_types(&channel_types)
      })
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let destination = interaction.get_channel("target-channel").unwrap();

    let guild = interaction.guild_id.unwrap().to_guild_cached(&ctx.cache).unwrap();

    // Try find the source channel, either from specified argument or through interaction author's current channel
    let origin_id = if let Some(partial) = interaction.get_channel("source-channel") {
      Some(partial.id)
    } else if let Some(state) = guild.voice_states.get(&interaction.user.id) {
      state.channel_id
    } else {
      None
    };

    if let Ok(permissions) = guild.member_permissions(&ctx.http, ctx.cache.current_user_id()).await {
      if !permissions.contains(Permissions::MOVE_MEMBERS) {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::Red)
          .title("Insuficcient permissions")
          .description("I don't have permission to move members in this server");

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
        return Ok(());
      }
    }

    if origin_id.is_none() {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .title("Unknown base channel")
        .description("Unless you're in a voice channel, you need to specify both the base and target channels.");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
      return Ok(());
    }

    let origin_id = origin_id.unwrap();

    if origin_id == destination.id {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .title("Nothing to move")
        .description("I can't move members from and to the same channel.");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
      return Ok(());
    }

    let origin_channel = guild.channels.get(&origin_id).unwrap().clone();
    let guild_channel = origin_channel.guild().unwrap();
    let members = guild_channel.members(&ctx.cache).await.unwrap();

    if members.is_empty() {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .title("Nobody to move")
        .description("There is nobody in the channel to move from.");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
      return Ok(());
    }

    for member in members {
      // Interestingly enough this has to be awaited for it to work
      let _ = member.move_to_voice_channel(&ctx.http, destination.id).await;
    }

    let mut embed = CreateEmbed::default();
    embed
      .color(Colors::Green)
      .title("Success")
      .description(format!("Successfully moved everybody to {}", destination.name.unwrap()));

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}
