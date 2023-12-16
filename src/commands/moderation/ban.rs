use serenity::all::{CommandInteraction, CommandOptionType, Context};
use serenity::async_trait;
use serenity::builder::{CreateCommand, CreateCommandOption, CreateEmbed, CreateEmbedAuthor, CreateMessage};
use serenity::model::{Permissions, Timestamp};

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Ban;

#[async_trait]
impl SlashCommand for Ban {
  fn register(&self) -> CreateCommand {
    CreateCommand::new("ban")
      .description("Ban a member")
      .dm_permission(false)
      .default_member_permissions(Permissions::BAN_MEMBERS)
      .add_option(CreateCommandOption::new(CommandOptionType::User, "member", "The member to ban").required(true))
      .add_option(CreateCommandOption::new(
        CommandOptionType::String,
        "reason",
        "The reason for banning"
      ))
      .add_option(CreateCommandOption::new(
        CommandOptionType::String,
        "notification",
        "A notification message to be sent to the user"
      ))
    //.add_option(CreateCommandOption::new(CommandOptionType::String, "audit-reason", "Override the reason in the audit log"))
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let user_id = interaction.get_user_id("member").unwrap();

    let guild_id = interaction.guild_id.unwrap();

    // Guards
    let bot_member = guild_id.current_user_member(ctx).await?;
    if !bot_member.permissions(ctx).unwrap().contains(Permissions::BAN_MEMBERS) {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Insuficcient permissions")
        .description("I don't have permission to ban members in this server");

      interaction.reply_embed(ctx, embed).await?;
      return Ok(());
    }

    let member = if let Ok(member) = guild_id.member(ctx, user_id).await {
      member
    } else {
      // Member not in the guild
      let user = user_id.to_user(ctx).await?;
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Member not found")
        .description(format!("{} wasn't found in the server", user.name)); // I assume this will do the ping thing?

      interaction.reply_embed_ephemeral(ctx, embed).await?;
      return Ok(());
    };

    if member.user.id == ctx.cache.current_user().id {
      // I can't ban myself
      let embed = CreateEmbed::new().color(Colors::Red).title("I can't ban myself");

      interaction.reply_embed_ephemeral(ctx, embed).await?;
      return Ok(());
    }

    if let Some(permissions) = member.permissions {
      if permissions.contains(Permissions::BAN_MEMBERS | Permissions::ADMINISTRATOR) {
        // Member is a moderator, don't ban
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Can't ban moderators")
          .description("Cannot ban moderators of the server");

        interaction.reply_embed(&ctx.http, embed).await?;
        return Ok(());
      }
    }


    if let Some(message) = interaction.get_string("notification") {
      let partial_guild = guild_id.to_partial_guild(ctx).await?;
      let mut author = CreateEmbedAuthor::new(format!("You have been banned from {}", partial_guild.name));
      if let Some(icon_url) = partial_guild.icon_url() {
        author = author.icon_url(icon_url); // There's gotta be a better way of doing this
      }

      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .author(author)
        .field("Message", message, false);

      if let Ok(dm) = user_id.create_dm_channel(ctx).await {
        dm.send_message(ctx, CreateMessage::new().embed(embed)).await?;
      }
    }

    let audit_reason = {
      let mut builder = vec![format!("[Issued by {}]", interaction.user.name)];
      if let Some(reason) = interaction
        .get_string("audit-reason")
        .or(interaction.get_string("reason"))
      {
        builder.push(reason);
      }
      builder.reverse();
      builder.join(" ")
    };

    match guild_id.ban_with_reason(ctx, member.user.id, 0, audit_reason).await {
      // dmd = Delete message days
      Ok(_) => {
        let mut embed = CreateEmbed::new()
          .color(Colors::Orange)
          .author(CreateEmbedAuthor::new(format!("{} banned", member.user.name)).icon_url(member.face()))
          .timestamp(Timestamp::now());

        if let Some(ban_reason) = interaction.get_string("reason") {
          embed = embed.field("Reason", ban_reason, false); // Someone help me
        }

        interaction
          .channel_id
          .send_message(ctx, CreateMessage::new().embed(embed))
          .await?;

        let confirmation = CreateEmbed::new().color(Colors::Green).title("Ban successful");
        interaction.reply_embed_ephemeral(ctx, confirmation).await?;
      }

      Err(why) => {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Could not perform ban")
          .field("Error", why.to_string(), false);

        interaction.reply_embed_ephemeral(ctx, embed).await?;
      }
    }

    Ok(())
  }
}
