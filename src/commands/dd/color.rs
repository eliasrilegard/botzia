use regex::{Match, Regex};
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{
  CreateAttachment,
  CreateCommandOption,
  CreateEmbed,
  CreateEmbedFooter,
  CreateInteractionResponseMessage
};
use serenity::client::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Color;

#[async_trait]
impl SlashSubCommand for Color {
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "color",
      "Emulate the forge color mechanic"
    )
    .add_sub_option(
      CreateCommandOption::new(
        CommandOptionType::String,
        "color-string",
        "The color string (the text between <color: and >)"
      )
      .required(true)
    )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let color_string = interaction.get_string("color-string").unwrap();

    let re = Regex::new(
      r"^[,\s]*(?<red>-?\d{1,3})([,\s]*,[,\s]*(?<green>-?\d{1,3}))?([,\s]*,[,\s]*(?<blue>-?\d{1,3}))?[,\s]*$"
    )
    .unwrap();

    if !re.is_match(&color_string) {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Invalid format")
        .description(
          "Take your character name, remove `<color:` and `>` so you're only entering the numbers and commas."
        );

      interaction.reply_embed(ctx, embed).await?;
      return Ok(());
    }

    let caps = re.captures(&color_string).unwrap();
    let red = caps.name("red").map(|m| into_constrained(m, 256)).unwrap();
    let green = caps.name("green").map(|cap| into_constrained(cap, 256)).unwrap_or(255);
    let blue = caps.name("blue").map(|cap| into_constrained(cap, 256)).unwrap_or(255);

    let hex = hexify(red, green, blue);
    let url = format!("https://singlecolorimage.com/get/{hex:0>6x}/300x200");
    let image_bytes = reqwest::get(url).await?.bytes().await?;

    let image = CreateAttachment::bytes(image_bytes, "color.png");

    let embed = CreateEmbed::new()
      .color(hex)
      .title("Resulting color")
      .description(format!(
        "`<color:{}>` is equivalent to `<color:{red},{green},{blue}>`",
        caps.get(0).unwrap().as_str()
      ))
      .attachment("color.png")
      .footer(CreateEmbedFooter::new(format!("Hex: {hex:0>6x}")));

    let data = CreateInteractionResponseMessage::new().embed(embed).add_file(image);
    interaction.reply(ctx, data).await?;
    Ok(())
  }
}

fn hexify(r: i32, g: i32, b: i32) -> u32 {
  ((r as u32) << 16) + ((g as u32) << 8) + (b as u32)
}

/// Converts a capture into a number beween `0` (incl) and `n` (excl)
fn into_constrained(capture: Match<'_>, n: i32) -> i32 {
  modulo(into_number(capture), n)
}

/// Converts a capture into an `i32`
fn into_number(capture: Match<'_>) -> i32 {
  capture.as_str().parse::<i32>().unwrap()
}

/// A number `i` modulo another number `n` is always in the range `[0..n]`
fn modulo(i: i32, n: i32) -> i32 {
  i.rem_euclid(n)
}
