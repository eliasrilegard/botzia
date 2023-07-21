use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed};
use serenity::model::application::interaction::autocomplete::AutocompleteInteraction;
use serenity::model::prelude::AttachmentType;
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use tokio::fs::File;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{InteractionCustomGet, BetterResponse, AutocompleteCustomGet};
use crate::Result;

use super::MonsterInfo;

pub struct Hzv;

impl Default for Hzv {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashSubCommand for Hzv {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("hzv")
      .description("Get the hitzone value for a monster")
      .create_sub_option(|option| option
        .kind(CommandOptionType::String)
        .name("monster")
        .description("The monster of interest")
        .set_autocomplete(true)
        .required(true)
      )
      .create_sub_option(|option| option
        .kind(CommandOptionType::Boolean)
        .name("hr")
        .description("Fetch HR values over MR, should both exist")
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let monster_name = interaction.get_string("monster").unwrap().replace(" ", "").to_ascii_lowercase();
    let is_hr = interaction.get_bool("hr").unwrap_or(false);

    let monsters_json = include_str!("../../../assets/monster_hunter_world/monster_data.json");
    let monsters: Vec<MonsterInfo> = serde_json::from_str(monsters_json).expect("JSON was not well formatted");

    let monster = if let Some(found_monster) = find_monster(&monsters, monster_name) {
      found_monster
    } else {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::RED)
        .title("Monster not found")
        .description("That monster doesn't seem to exist!\nCheck out `/mhw list` for a list of all monsters.");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
      return Ok(());
    };

    let (hzv, hzv_filepath) = if is_hr {
      (
        monster.details.hzv_hr.as_ref().unwrap_or(&monster.details.hzv),
        monster.details.hzv_filepath_hr.as_ref().unwrap_or(&monster.details.hzv_filepath)
      )
    } else {
      (&monster.details.hzv, &monster.details.hzv_filepath)
    };

    let thumbnail_file = File::open(&monster.details.icon_filepath).await?;
    let thumbnail_filename = format!("{}.webp", &monster.name.replace("'", "")); // Filter out characters that interferes
    let thumbnail = AttachmentType::File {
      file: &thumbnail_file,
      filename: thumbnail_filename.clone()
    };

    let hzv_image_file = File::open(hzv_filepath).await?;
    let hzv_image_filename = format!("{}_hzv.png", &monster.name.replace("'", ""));
    let hzv_image = AttachmentType::File {
      file: &hzv_image_file,
      filename: hzv_image_filename.replace("'", "")
    };

    let threat_level = if let Some(level) = &monster.details.threat_level {
      format!("  {}", level)
    } else {
      "".to_string()
    };

    let mut embed = CreateEmbed::default();
    embed
      .color(Colors::GREEN)
      .title(format!("__**{}**__{}", monster.details.title, threat_level))
      .thumbnail(format!("attachment://{}", thumbnail_filename))
      .image(format!("attachment://{}", hzv_image_filename))
      .fields([
        ("Classification", &monster.details.species, false),
        ("Characteristics", &monster.details.description, false),
        (
          &format!("Slash: **{}** Blunt: **{}** Shot: **{}**", hzv.slash, hzv.blunt, hzv.shot),
          &format!("🔥 **{}** 💧 **{}** ⚡ **{}** ❄️ **{}** 🐉 **{}**", hzv.fire, hzv.water, hzv.thunder, hzv.ice, hzv.dragon),
          false
        )      
      ]);

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed).files([thumbnail, hzv_image])).await?;
    Ok(())
  }

  async fn autocomplete(&self, ctx: &Context, interaction: &AutocompleteInteraction, _: &Database) -> Result<()> {
    let focused_value = if let Some(value) = interaction.get_focused_option().value {
      value.as_str().unwrap_or("").to_ascii_lowercase().replace(" ", "")
    } else { "".to_string() };
    
    let monsters_json = include_str!("../../../assets/monster_hunter_world/monster_data.json");
    let monsters: Vec<MonsterInfo> = serde_json::from_str(monsters_json).expect("JSON was not well formatted");

    let mut options = monsters.iter().filter_map(|monster| {
      if monster.name.contains(&focused_value) || monster.details.aliases.iter().any(|alias| alias.contains(&focused_value)) {
        Some((&monster.details.title, &monster.name))
      } else {
        None
      }
    }).collect::<Vec<_>>();
    options.sort_by(|(a, _), (b, _)| a.cmp(b));

    interaction.create_autocomplete_response(&ctx.http, |response| {
      for i in 0..options.len().min(25) {
        response.add_string_choice(options[i].0, options[i].1);
      }
      response
    }).await?;
    
    Ok(())
  }
}

fn find_monster(monsters: &Vec<MonsterInfo>, monster_name: String) -> Option<&MonsterInfo> {
  if let Some(by_name) = monsters.iter().find(|monster| monster.name.contains(&monster_name)) {
    Some(by_name)
  } else if let Some(by_alias) = monsters.iter().find(|monster| monster.details.aliases.iter().any(|alias| alias.contains(&monster_name))) {
    Some(by_alias)
  } else {
    None
  }
}