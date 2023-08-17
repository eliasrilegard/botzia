use std::borrow::Cow;

use regex::{Match, Regex};
use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Color;

#[async_trait]
impl SlashSubCommand for Color {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("color")
      .description("Emulate the forge color mechanic")
      .create_sub_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("color-string")
          .description("The color string (the text between <color: and >)")
          .required(true)
      })
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let color_string = interaction.get_string("color-string").unwrap();

    let re = Regex::new(
      r"^[,\s]*(?<red>-?\d{1,3})([,\s]*,[,\s]*(?<green>-?\d{1,3}))?([,\s]*,[,\s]*(?<blue>-?\d{1,3}))?[,\s]*$"
    )
    .unwrap();

    if !re.is_match(&color_string) {
      let mut embed = CreateEmbed::default();
      embed.color(Colors::Red).title("Invalid format").description(
        "Take your character name, remove `<color:` and `>` so you're only entering the numbers and commas."
      );

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
      return Ok(());
    }

    let caps = re.captures(&color_string).unwrap();
    let red = caps.name("red").map(|m| into_constrained(m, 256)).unwrap();
    let green = if let Some(cap) = caps.name("green") {
      into_constrained(cap, 256)
    } else {
      255
    };
    let blue = if let Some(cap) = caps.name("blue") {
      into_constrained(cap, 256)
    } else {
      255
    };

    let hex = hexify(red, green, blue);
    let url = format!("https://singlecolorimage.com/get/{:0>6x}/300x200", hex);
    let image_bytes = reqwest::get(url).await?.bytes().await?;

    let image = serenity::model::channel::AttachmentType::Bytes {
      data: Cow::Borrowed(&image_bytes),
      filename: "color.png".into()
    };

    let mut embed = CreateEmbed::default();
    embed
      .color(hex)
      .title("Resulting color")
      .description(format!(
        "`<color:{}>` is equivalent to `<color:{},{},{}>`",
        caps.get(0).unwrap().as_str(),
        red,
        green,
        blue
      ))
      .attachment("color.png")
      .footer(|footer| footer.text(format!("Hex: {:0>6x}", hex)));

    interaction
      .reply(&ctx.http, |msg| msg.set_embed(embed).add_file(image))
      .await?;
    Ok(())
  }
}

fn hexify(r: i32, g: i32, b: i32) -> u32 {
  ((r as u32) << 16) + ((g as u32) << 8) + (b as u32)
}

/// Converts a capture into a number beween `0` (incl) and `modulo` (excl)
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
