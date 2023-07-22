use serde::Deserialize;

use super::NamedSubCommands;

mod hzv;
mod list;

pub fn commands() -> NamedSubCommands {
  vec![
    ("hzv", Box::<hzv::Hzv>::default()),
    ("list", Box::<list::List>::default())
  ]
}


#[derive(Debug, Deserialize)]
pub(crate) struct MonsterInfo {
  name: String,
  details: MonsterDetails
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct MonsterDetails {
  aliases: Vec<String>,
  title: String,
  url: String,
  description: String,
  thumbnail: String,
  elements: Vec<String>,
  ailments: Vec<String>,
  locations: Vec<MonsterLocation>,
  info: String,
  hzv: MonsterHitzones,
  hzv_hr: Option<MonsterHitzones>,
  species: String,
  useful_info: String,
  resistances: Vec<String>,
  weakness: Vec<String>,
  icon_filepath: String,
  hzv_filepath: String,
  hzv_filepath_hr: Option<String>,
  threat_level: Option<String>
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct MonsterLocation {
  name: String,
  color: String,
  icon: Option<String>,
  tempered: Option<bool>
}

#[derive(Debug, Deserialize)]
pub struct MonsterHitzones {
  slash: String,
  blunt: String,
  shot: String,
  fire: String,
  water: String,
  thunder: String,
  ice: String,
  dragon: String
}