use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::model::{Permissions, Timestamp};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{InteractionCustomGet, BetterResponse};
use crate::Result;

pub struct Kick;

impl Default for Kick {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashCommand for Kick {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    command
      .name("kick")
      .description("Kick a member")
      .dm_permission(false)
      .default_member_permissions(Permissions::KICK_MEMBERS)
      .create_option(|option| option
        .kind(CommandOptionType::User)
        .name("member")
        .description("The member to kick")
        .required(true)
      )
      .create_option(|option| option
        .kind(CommandOptionType::String)
        .name("reason")
        .description("The reason for kicking")
      )
      .create_option(|option| option
        .kind(CommandOptionType::String)
        .name("notification")
        .description("A notification message to be sent to the user")
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let (user, _) = interaction.get_user("member").unwrap();
    let reason = interaction.get_string("reason");
    let notification = interaction.get_string("notification");

    let guild = interaction.guild_id.unwrap().to_guild_cached(&ctx.cache).unwrap();

    
    // Guards

    let bot_id = ctx.cache.current_user_id();
    if let Ok(permissions) = guild.member_permissions(&ctx.http, bot_id).await {
      if !permissions.contains(Permissions::KICK_MEMBERS) {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::RED)
          .title("Insuficcient permissions")
          .description(format!("I don't have permission to kick members in this server"));
        
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
        .color(Colors::RED)
        .title("Member not found")
        .description(format!("{} wasn't found in the server", user)); // I assume this will do the ping thing?

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
      return Ok(());
    };

    if member.user.id == bot_id {
      // I can't kick myself
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::RED)
        .title("I can't kick myself");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
      return Ok(());
    }

    if let Some(permissions) = member.permissions {
      if permissions.contains(Permissions::KICK_MEMBERS | Permissions::ADMINISTRATOR) {
        // Member is a moderator, don't kick
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::RED)
          .title("Can't kick moderators")
          .description("Cannot kick moderators of the server");

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
        return Ok(());
      }
    }


    if let Some(message) = notification {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::RED)
        .author(|author| {
          if let Some(url) = guild.icon_url() {
            author.icon_url(url);
          }
          author.name(format!("You have been kicked from {}", guild.name))
        })
        .field("Message", message, false);
      
      if let Ok(dm_channel) = user.create_dm_channel(&ctx.http).await {
        let _ = dm_channel.send_message(&ctx.http, |msg| msg.set_embed(embed)).await;
      }
    }

    let audit_reason = if let Some(kick_reason) = reason.clone() { // Clone because we need to use it twice and I'm lazy
      format!("{} [Issued by {}]", kick_reason, interaction.user.tag())
    } else {
      format!("[Issued by {}]", interaction.user.tag())
    };

    match guild.kick_with_reason(&ctx.http, member.user.id, audit_reason.as_str()).await {
      Ok(_) => {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::ORANGE)
          .author(|author| author
            .name(format!("{} kicked", member.user.tag()))
            .icon_url(member.face())
          )
          .timestamp(Timestamp::now());
        
        if let Some(kick_reason) = reason {
          embed.field("Reason", kick_reason, false);
        }

        let _ = interaction.channel_id.send_message(&ctx.http, |msg| msg.set_embed(embed)).await;
        
        let mut response = CreateEmbed::default();
        response
          .color(Colors::GREEN)
          .title("Kick successful");
        
        interaction.reply(&ctx.http, |msg| msg.set_embed(response).ephemeral(true)).await?;
      },

      Err(why) => {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::RED)
          .title("Could not perform kick")
          .field("Error", why, false);

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
      }
    }
    
    Ok(())
  }
}