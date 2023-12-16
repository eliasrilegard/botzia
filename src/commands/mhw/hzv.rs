use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{
  AutocompleteChoice,
  CreateAttachment,
  CreateAutocompleteResponse,
  CreateCommandOption,
  CreateEmbed,
  CreateInteractionResponseFollowup
};
use serenity::client::Context;

use super::MonsterInfo;
use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::{Database, ASSETS_URL};
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Hzv;

#[async_trait]
impl SlashSubCommand for Hzv {
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "hzv",
      "Get the hitzone value for a monster"
    )
    .add_sub_option(
      CreateCommandOption::new(CommandOptionType::String, "monster", "The monster of interest")
        .set_autocomplete(true)
        .required(true)
    )
    .add_sub_option(CreateCommandOption::new(
      CommandOptionType::Boolean,
      "hr",
      "Fetch HR values over MR, should both exist"
    ))
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let monster_name = interaction
      .get_string("monster")
      .unwrap()
      .replace(' ', "")
      .to_ascii_lowercase();
    let is_hr = interaction.get_bool("hr").unwrap_or(false);

    let monsters_json = include_str!("../../../assets/monster_hunter_world/monster_data.json");
    let monsters: Vec<MonsterInfo> = serde_json::from_str(monsters_json).expect("JSON was not well formatted");

    let monster = if let Some(found_monster) = find_monster(&monsters, monster_name) {
      found_monster
    } else {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Monster not found")
        .description("That monster doesn't seem to exist!\nCheck out `/mhw list` for a list of all monsters.");

      interaction.reply_embed(ctx, embed).await?;
      return Ok(());
    };

    let (hzv, hzv_filepath) = if is_hr {
      (
        monster.details.hzv_hr.as_ref().unwrap_or(&monster.details.hzv),
        monster
          .details
          .hzv_filepath_hr
          .as_ref()
          .unwrap_or(&monster.details.hzv_filepath)
      )
    } else {
      (&monster.details.hzv, &monster.details.hzv_filepath)
    };

    interaction.defer(ctx).await?;

    let thumbnail_filename = format!("{}.webp", &monster.name.replace('\'', "")); // Filter out characters that interferes
    let thumbnail_image_bytes = reqwest::get(format!("{ASSETS_URL}/{}", monster.details.icon_filepath))
      .await?
      .bytes()
      .await?;
    let thumbnail = CreateAttachment::bytes(thumbnail_image_bytes, &thumbnail_filename);

    let hzv_image_filename = format!("{}_hzv.png", &monster.name.replace('\'', ""));
    let hzv_image_bytes = reqwest::get(format!("{ASSETS_URL}/{hzv_filepath}"))
      .await?
      .bytes()
      .await?;
    let hzv_image = CreateAttachment::bytes(hzv_image_bytes, &hzv_image_filename);

    let threat_level = monster
      .details
      .threat_level
      .clone()
      .map_or(String::default(), |level| format!("  {level}"));

    let embed = CreateEmbed::new()
      .color(Colors::Green)
      .title(format!("__**{}**__{threat_level}", monster.details.title))
      .thumbnail(format!("attachment://{thumbnail_filename}"))
      .image(format!("attachment://{hzv_image_filename}"))
      .fields([
        ("Classification", &monster.details.species, false),
        ("Characteristics", &monster.details.description, false),
        (
          &format!(
            "Slash: **{}** Blunt: **{}** Shot: **{}**",
            hzv.slash, hzv.blunt, hzv.shot
          ),
          &format!(
            "🔥 **{}** 💧 **{}** ⚡ **{}** ❄️ **{}** 🐉 **{}**",
            hzv.fire, hzv.water, hzv.thunder, hzv.ice, hzv.dragon
          ),
          false
        )
      ]);

    let builder = CreateInteractionResponseFollowup::new()
      .embed(embed)
      .files([thumbnail, hzv_image]);
    interaction.create_followup(ctx, builder).await?;

    Ok(())
  }

  async fn autocomplete(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let focused_value = interaction
      .data
      .autocomplete()
      .map(|option| option.value.to_ascii_lowercase().replace(' ', ""))
      .unwrap_or_default();

    let monsters_json = include_str!("../../../assets/monster_hunter_world/monster_data.json");
    let mut monsters: Vec<MonsterInfo> = serde_json::from_str(monsters_json).expect("JSON was not well formatted");
    monsters.sort_by(|left, right| left.details.title.cmp(&right.details.title));

    let choices = monsters
      .iter()
      .filter(|monster| {
        monster.name.contains(&focused_value)
          || monster
            .details
            .aliases
            .iter()
            .any(|alias| alias.contains(&focused_value))
      })
      .take(25)
      .map(|monster| AutocompleteChoice::new(monster.details.title.clone(), monster.name.clone()))
      .collect::<Vec<_>>();

    let data = CreateAutocompleteResponse::new().set_choices(choices);
    interaction.respond_autocomplete(ctx, data).await?;

    Ok(())
  }
}

fn find_monster(monsters: &[MonsterInfo], monster_name: String) -> Option<&MonsterInfo> {
  monsters
    .iter()
    .find(|monster| monster.name.contains(&monster_name))
    .or(monsters.iter().find(|monster| {
      monster
        .details
        .aliases
        .iter()
        .any(|alias| alias.contains(&monster_name))
    }))
}
