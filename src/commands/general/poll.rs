use rand::Rng;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{
  CreateCommand,
  CreateCommandOption,
  CreateEmbed,
  CreateEmbedAuthor,
  CreateEmbedFooter,
  CreateMessage
};
use serenity::client::Context;
use serenity::model::prelude::{ChannelType, EmojiId, ReactionType};
use serenity::model::{Permissions, Timestamp};

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Poll;

#[async_trait]
impl SlashCommand for Poll {
  fn register(&self) -> CreateCommand {
    CreateCommand::new("poll")
      .description("Make a poll about something")
      .add_option(CreateCommandOption::new(CommandOptionType::String, "title", "The title of the poll").required(true))
      .add_option(
        CreateCommandOption::new(
          CommandOptionType::String,
          "options",
          "The options to vote on, separated by ;"
        )
        .required(true)
      )
      .add_option(
        CreateCommandOption::new(CommandOptionType::Channel, "channel", "The channel to post the poll in")
          .channel_types(vec![ChannelType::Text])
      )
      .dm_permission(false)
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let question = interaction.get_string("title").unwrap();
    let options_raw = interaction.get_string("options").unwrap();

    let channel_id = interaction.get_channel_id("channel").unwrap_or(interaction.channel_id);

    let guild_channel = channel_id.to_channel(ctx).await?.guild().unwrap();

    let bot_permissions = guild_channel
      .permissions_for_user(ctx, ctx.cache.current_user().id)
      .unwrap();
    if !bot_permissions.contains(Permissions::SEND_MESSAGES) {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Insuficcient permissions")
        .description(format!("I cannot send messages in {guild_channel}"));

      interaction.reply_embed_ephemeral(ctx, embed).await?;
      return Ok(());
    }

    let user_permissions = guild_channel.permissions_for_user(ctx, interaction.user.id).unwrap();
    if !user_permissions.contains(Permissions::SEND_MESSAGES) {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Insufficient permissions")
        .description(format!("You cannot send messages in {guild_channel}"));

      interaction.reply_embed_ephemeral(ctx, embed).await?;
      return Ok(());
    }

    let options = options_raw.split(';').map(|option| option.trim()).collect::<Vec<_>>();
    if options.len() < 2 || options.len() > 20 {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Check arguments")
        .description("A poll needs at least 2 and at most 20 options.");

      interaction.reply_embed_ephemeral(ctx, embed).await?;
      return Ok(());
    }

    let mut emotes = [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🌶', '🌽',
      '🥕'
    ]
    .iter()
    .map(|&emote| emote.into())
    .collect::<Vec<ReactionType>>();

    if rand::random::<f32>() < 0.05 {
      let index = rand::thread_rng().gen_range(0..options.len());
      emotes.insert(index, ReactionType::Custom {
        name: Some("kekw".to_string()),
        id: EmojiId::new(743962015411732510),
        animated: false
      });
    }
    // emotes.shuffle(&mut rand::thread_rng());

    let mut choices: Vec<String> = vec![];
    for i in 0..options.len() {
      choices.push(format!("{} - {}", emotes[i], options[i]));
    }

    let response = CreateEmbed::new()
      .color(Colors::Green)
      .title("Success")
      .description(format!("Posting the poll in {}", guild_channel));

    interaction.reply_embed_ephemeral(ctx, response).await?;

    let member = interaction.member.as_ref().unwrap();
    let author = CreateEmbedAuthor::new(format!("{} created a poll", member.display_name())).icon_url(member.face()); // .face() has fallback functionality built in

    let footer = CreateEmbedFooter::new("React with your vote below!");

    let embed = CreateEmbed::new()
      .color(Colors::Blue)
      .author(author)
      .title(question)
      .field("Choices", choices.join("\n"), false)
      .footer(footer)
      .timestamp(Timestamp::now());

    let message = CreateMessage::new().embed(embed);

    if let Ok(poll_msg) = guild_channel.send_message(ctx, message).await {
      for emote in emotes.iter().take(options.len()) {
        poll_msg.react(ctx, emote.clone()).await?;
      }
    }

    Ok(())
  }
}
