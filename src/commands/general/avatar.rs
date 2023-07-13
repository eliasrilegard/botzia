use color_thief::ColorFormat;
use image::DynamicImage;

use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{InteractionCustomGet, BetterResponse};
use crate::Result;

pub struct Avatar;

impl Default for Avatar {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashCommand for Avatar {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) ->  &'a mut CreateApplicationCommand {
    command
      .name("avatar")
      .description("Get the avatar of a user")
      .create_option(|option| option
        .kind(CommandOptionType::User)
        .name("user")
        .description("The user of interest")
        .required(true)
      )
  }
  
  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let (user, _) = interaction.get_user("user").unwrap();

    let guild = interaction.guild_id.unwrap().to_guild_cached(&ctx.cache).unwrap();
    let avatar_url = if let Ok(member) = guild.member(&ctx.http, user.id).await {
      member.face()
    } else {
      user.face()
    };

    let request_url = avatar_url.replace(".webp", ".png");
    let display_url = request_url.replace("?size=1024", "?size=4096");

    let image_bytes = reqwest::get(request_url.replace("?size=1024", "")).await?.bytes().await?;
    let image = image::load_from_memory(&image_bytes)?;

    let color_format = get_color_format(&image);
    // get_dominant_color(image, format) = get_palette(image, format, quality = 1, palette_size = 5)[0];
    let palette = color_thief::get_palette(image.as_bytes(), color_format, 1, 5).unwrap();
    let dominant_color = hexify(palette[0].r, palette[0].g, palette[0].b);

    let mut embed = CreateEmbed::default();
    embed
      .color(dominant_color)
      .description(format!("Dominant color: #{:0>6x}", dominant_color))
      .author(|author| author
        .name(user.tag())
        .icon_url(&display_url)
      )
      .image(&display_url);
    
    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}

// https://github.com/RazrFalcon/color-thief-rs/blob/master/tests/test.rs
fn get_color_format(image: &DynamicImage) -> ColorFormat {
  match image {
    DynamicImage::ImageRgb8(_) => {
      ColorFormat::Rgb
    }
    DynamicImage::ImageRgba8(_) => {
      ColorFormat::Rgba
    }
    _ => unreachable!(),
  }
}

fn hexify(r: u8, g: u8, b: u8) -> u32 {
  ((r as u32) << 16) + ((g as u32) << 8) + (b as u32)
}