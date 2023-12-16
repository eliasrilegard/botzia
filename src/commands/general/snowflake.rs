use regex::Regex;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommand, CreateCommandOption, CreateEmbed, CreateEmbedFooter};
use serenity::client::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Snowflake;

#[async_trait]
impl SlashCommand for Snowflake {
  fn register(&self) -> CreateCommand {
    CreateCommand::new("snowflake")
      .description("Convert a Discord snowflake to a dynamic timestamp")
      .add_option(
        CreateCommandOption::new(CommandOptionType::String, "snowflake", "The snowflake to convert").required(true)
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let snowflake = interaction.get_string("snowflake").unwrap();
    let re = Regex::new(r"^\d{1,20}$").unwrap();
    if !re.is_match(&snowflake) {
      let embed = CreateEmbed::new().color(Colors::Red).title("Invalid snowflake");
      interaction.reply_embed_ephemeral(ctx, embed).await?;
      return Ok(());
    }

    let unix_millis = (snowflake.parse::<u64>().unwrap() >> 22) + 1_420_070_400_000_u64; // Discord constant
    let unix_seconds = unix_millis / 1000;

    let formatted = format!("<t:{0}:D> at <t:{0}:T>", unix_seconds);

    let embed = CreateEmbed::new()
      .color(Colors::Blue)
      .title(formatted)
      .footer(CreateEmbedFooter::new(format!("Snowflake: {snowflake}")));

    interaction.reply_embed(ctx, embed).await?;
    Ok(())
  }
}
