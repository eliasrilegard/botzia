use color_thief::ColorFormat;
use image::DynamicImage;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommand, CreateCommandOption, CreateEmbed, CreateEmbedAuthor};
use serenity::client::Context;

use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Avatar;

#[async_trait]
impl SlashCommand for Avatar {
  fn register(&self) -> CreateCommand {
    CreateCommand::new("avatar")
      .description("Get the avatar of a user")
      .add_option(CreateCommandOption::new(CommandOptionType::User, "user", "The user of interest").required(true))
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let user_id = interaction.get_user_id("user").unwrap();
    let user = user_id.to_user(ctx).await?;

    let avatar_url = match interaction.guild_id {
      Some(id) => id.member(ctx, user_id).await?.face(),
      None => user.face()
    };

    let request_url = avatar_url.replace(".webp", ".png");
    let display_url = request_url.replace("?size=1024", "?size=4096");

    let image_bytes = reqwest::get(request_url.replace("?size=1024", ""))
      .await?
      .bytes()
      .await?;
    let image = image::load_from_memory(&image_bytes)?;

    let color_format = get_color_format(&image);
    // get_dominant_color(image, format) = get_palette(image, format, quality = 1, palette_size = 5)[0];
    let palette = color_thief::get_palette(image.as_bytes(), color_format, 1, 5).unwrap();
    let dominant_color = hexify(palette[0].r, palette[0].g, palette[0].b);

    let embed = CreateEmbed::new()
      .color(dominant_color)
      .description(format!("Dominant Color: #{dominant_color:0>6x}"))
      .author(CreateEmbedAuthor::new(user.name).icon_url(&display_url))
      .image(&display_url);

    interaction.reply_embed(ctx, embed).await?;
    Ok(())
  }
}

// https://github.com/RazrFalcon/color-thief-rs/blob/master/tests/test.rs
fn get_color_format(image: &DynamicImage) -> ColorFormat {
  match image {
    DynamicImage::ImageRgb8(_) => ColorFormat::Rgb,
    DynamicImage::ImageRgba8(_) => ColorFormat::Rgba,
    _ => unreachable!()
  }
}

fn hexify(r: u8, g: u8, b: u8) -> u32 {
  ((r as u32) << 16) + ((g as u32) << 8) + (b as u32)
}
