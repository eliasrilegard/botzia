use rand::seq::SliceRandom;

use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed, CreateEmbedAuthor, CreateEmbedFooter};
use serenity::model::{Permissions, Timestamp};
use serenity::model::prelude::{ChannelType, ReactionType, EmojiId};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::commands::SlashCommand;
use crate::interaction::{InteractionCustomGet, BetterResponse};
use crate::Result;

pub struct Poll;

impl Default for Poll {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashCommand for Poll {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) ->  &'a mut CreateApplicationCommand {
    command
      .name("poll")
      .description("Make a poll about something")
      .create_option(|option| option
        .kind(CommandOptionType::String)
        .name("title")
        .description("The title of the poll")
        .required(true)
      )
      .create_option(|option| option
        .kind(CommandOptionType::String)
        .name("options")
        .description("The options to vote on, separated by ;")
        .required(true)
      )
      .create_option(|option| option
        .kind(CommandOptionType::Channel)
        .name("channel")
        .description("The channel to post the poll in")
        .channel_types(&[ChannelType::Text])
      )
      .dm_permission(false)
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction) -> Result<()> {
    let question = interaction.get_string("title").unwrap();
    let options_raw = interaction.get_string("options").unwrap();
        
    let channel_id = if let Some(partial_channel) = interaction.get_channel("channel") {
      partial_channel.id
    } else {
      interaction.channel_id
    };

    let guild_channel = ctx.cache.guild_channel(channel_id).unwrap();

    if let Ok(permissions) = guild_channel.permissions_for_user(&ctx.cache, ctx.cache.current_user_id()) {
      if !permissions.contains(Permissions::SEND_MESSAGES) {
        let mut embed = CreateEmbed::default();
        embed
          .color(0xcc0000)
          .title("Insuficcient permissions")
          .description(format!("I cannot send messages in {}", guild_channel));
        
        interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
        return Ok(());
      }
    }

    if let Ok(permissions) = guild_channel.permissions_for_user(&ctx.cache, interaction.user.id) {
      if !permissions.contains(Permissions::SEND_MESSAGES) {
        let mut embed = CreateEmbed::default();
        embed
          .color(0xcc0000)
          .title("Insufficient permissions")
          .description(format!("You cannot send messages in {}", guild_channel));

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
        return Ok(());
      }
    }

    let options = options_raw.split(';').map(|option| option.trim()).collect::<Vec<_>>();
    if options.len() < 2 || options.len() > 20 {
      let mut embed = CreateEmbed::default();
      embed
        .color(0xcc0000)
        .title("Check arguments")
        .description("A poll needs at least 2 and at most 20 options.");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
      return Ok(());
    }

    let mut emotes: Vec<ReactionType> = vec!['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🌶', '🌽', '🥕'].iter().map(|&emote| emote.into()).collect::<Vec<_>>();
    if rand::random::<f32>() < 0.05_f32 {
      emotes.push(ReactionType::Custom {
        name: Some("kekw".to_string()),
        id: EmojiId(743962015411732510),
        animated: false
      });
    }
    emotes.shuffle(&mut rand::thread_rng());

    let mut choices: Vec<String> = vec![];
    for i in 0..options.len() {
      choices.push(format!("{} - {}", emotes[i], options[i]));
    }

    let mut response = CreateEmbed::default();
    response
      .color(0x00cc00)
      .title("Success")
      .description(format!("Posting the poll in {}", guild_channel));

    interaction.reply(&ctx.http, |msg| msg.set_embed(response).ephemeral(true)).await?;

    let member = interaction.member.as_ref().unwrap();
    let mut author = CreateEmbedAuthor::default();
    author
      .name(format!("{} created a poll", member.display_name()))
      .icon_url(member.face()); // .face() has fallback functionality built in
        
    let mut footer = CreateEmbedFooter::default();
    footer.text("React with your vote below!");
    
    let mut embed = CreateEmbed::default();
    embed
      .color(0x0066cc)
      .set_author(author)
      .title(question)
      .field("Choices", choices.join("\n"), false)
      .set_footer(footer)
      .timestamp(Timestamp::now());
    
    if let Ok(poll_msg) = guild_channel.send_message(&ctx.http, |msg| msg.set_embed(embed)).await {
      for i in 0..options.len() {
        let _ = poll_msg.react(&ctx.http, emotes[i].clone()).await;
      }
    }
    
    Ok(())
  }
}