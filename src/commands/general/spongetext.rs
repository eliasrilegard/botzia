use regex::Regex;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommand, CreateCommandOption, CreateEmbed};
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct SpongeText;

#[async_trait]
impl SlashCommand for SpongeText {
  fn register(&self) -> CreateCommand {
    CreateCommand::new("spongetext")
      .description(format!(
        "Convert text into {}",
        randomize_case("sponge case".to_string())
      ))
      .add_option(CreateCommandOption::new(CommandOptionType::String, "text", "The text to convert").required(true))
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let input = interaction.get_string("text").unwrap();
    let output = randomize_case(input);

    let embed = CreateEmbed::new()
      .color(Colors::Blue)
      .title("Here's your converted text")
      .description(output);

    interaction.reply_embed_ephemeral(&ctx.http, embed).await?;
    Ok(())
  }
}

fn randomize_case(input: String) -> String {
  let mut output = String::new();

  let re = Regex::new(r"\S").unwrap();
  let length = re.captures_iter(input.as_str()).count();
  let mut is_capitalized = Vec::new();

  // First two cases are random
  is_capitalized.push(rand::random::<bool>());
  is_capitalized.push(rand::random::<bool>());

  for i in 2..length {
    is_capitalized.push(
      // Two consecutive cases at the most, exclude whitespace
      if is_capitalized[i - 1] == is_capitalized[i - 2] {
        !is_capitalized[i - 1]
      } else {
        rand::random::<bool>()
      }
    );
  }

  let mut j: usize = 0;
  for ch in input.chars() {
    if ch == ' ' {
      output.push(' ');
      continue;
    }
    output.push(if is_capitalized[j] {
      ch.to_ascii_uppercase()
    } else {
      ch.to_ascii_lowercase()
    });
    j += 1; // Increase only when used
  }

  output
}
