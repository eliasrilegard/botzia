use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::model::{Permissions, Timestamp};
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Ban;

#[async_trait]
impl SlashCommand for Ban {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    command
      .name("ban")
      .description("Ban a member")
      .dm_permission(false)
      .default_member_permissions(Permissions::BAN_MEMBERS)
      .create_option(|option| {
        option
          .kind(CommandOptionType::User)
          .name("member")
          .description("The member to ban")
          .required(true)
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("reason")
          .description("The reason for baning")
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("notification")
          .description("A notification message to be sent to the user")
      })
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let (user, _) = interaction.get_user("member").unwrap();
    let reason = interaction.get_string("reason");
    let notification = interaction.get_string("notification");

    let guild = interaction.guild_id.unwrap().to_guild_cached(&ctx.cache).unwrap();


    // Guards

    let bot_id = ctx.cache.current_user_id();
    if let Ok(permissions) = guild.member_permissions(&ctx.http, bot_id).await {
      if !permissions.contains(Permissions::BAN_MEMBERS) {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::Red)
          .title("Insuficcient permissions")
          .description("I don't have permission to ban members in this server");

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
        return Ok(());
      }
    }

    let member = if let Ok(member) = guild.member(&ctx.http, user.id).await {
      member
    } else {
      // Member not in the guild
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .title("Member not found")
        .description(format!("{} wasn't found in the server", user)); // I assume this will do the ping thing?

      interaction
        .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
        .await?;
      return Ok(());
    };

    if member.user.id == bot_id {
      // I can't ban myself
      let mut embed = CreateEmbed::default();
      embed.color(Colors::Red).title("I can't ban myself");

      interaction
        .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
        .await?;
      return Ok(());
    }

    if let Some(permissions) = member.permissions {
      if permissions.contains(Permissions::BAN_MEMBERS | Permissions::ADMINISTRATOR) {
        // Member is a moderator, don't ban
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::Red)
          .title("Can't ban moderators")
          .description("Cannot ban moderators of the server");

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
        return Ok(());
      }
    }


    if let Some(message) = notification {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .author(|author| {
          if let Some(url) = guild.icon_url() {
            author.icon_url(url);
          }
          author.name(format!("You have been banned from {}", guild.name))
        })
        .field("Message", message, false);

      if let Ok(dm_channel) = user.create_dm_channel(&ctx.http).await {
        let _ = dm_channel.send_message(&ctx.http, |msg| msg.set_embed(embed)).await;
      }
    }

    let audit_reason = if let Some(ban_reason) = reason.clone() {
      // Clone because we need to use it twice and I'm lazy
      format!("{} [Issued by {}]", ban_reason, interaction.user.tag())
    } else {
      format!("[Issued by {}]", interaction.user.tag())
    };

    match guild
      .ban_with_reason(&ctx.http, member.user.id, 0, audit_reason.as_str())
      .await
    {
      // dmd = Delete message days
      Ok(_) => {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::Orange)
          .author(|author| {
            author
              .name(format!("{} banned", member.user.tag()))
              .icon_url(member.face())
          })
          .timestamp(Timestamp::now());

        if let Some(ban_reason) = reason {
          embed.field("Reason", ban_reason, false);
        }

        let _ = interaction
          .channel_id
          .send_message(&ctx.http, |msg| msg.set_embed(embed))
          .await;

        let mut response = CreateEmbed::default();
        response.color(Colors::Green).title("Ban successful");

        interaction
          .reply(&ctx.http, |msg| msg.set_embed(response).ephemeral(true))
          .await?;
      }

      Err(why) => {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::Red)
          .title("Could not perform ban")
          .field("Error", why, false);

        interaction
          .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
          .await?;
      }
    }

    Ok(())
  }
}
