use regex::Regex;

use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::model::prelude::application_command::ApplicationCommandInteraction;
use serenity::model::prelude::command::CommandOptionType;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::Result;
use crate::interaction::{InteractionCustomGet, BetterResponse};

pub struct Snowflake;

impl Default for Snowflake {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashCommand for Snowflake {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) ->  &'a mut CreateApplicationCommand {
    command
      .name("snowflake")
      .description("Convert a Discord snowflake to a dynamic timestamp")
      .create_option(|option| option
        .kind(CommandOptionType::String)
        .name("snowflake")
        .description("The snowflake to convert")
        .required(true)
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let snowflake = interaction.get_string("snowflake").unwrap();
    let re = Regex::new(r"^\d{1,20}$").unwrap();
    if !re.is_match(snowflake.as_str()) {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::RED)
        .title("Invalid snowflake");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true)).await?;
      return Ok(());
    }

    let unix_millis = (snowflake.parse::<u64>().unwrap() >> 22) + 1_420_070_400_000_u64; // Discord constant
    let unix_seconds = unix_millis / 1000;

    let formatted = format!("<t:{x}:D> at <t:{x}:T>", x = unix_seconds);

    let mut embed = CreateEmbed::default();
    embed
      .color(Colors::BLUE)
      .title(formatted)
      .footer(|footer| footer.text(format!("Snowflake: {}", snowflake)));

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}