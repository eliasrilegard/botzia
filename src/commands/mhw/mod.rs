use serde::Deserialize;

use super::NamedSubCommands;

mod hzv;
mod list;

pub fn commands() -> NamedSubCommands {
  vec![
    ("hzv", Box::<hzv::Hzv>::default()),
    ("list", Box::<list::List>::default()),
  ]
}


#[derive(Debug, Deserialize)]
pub struct MonsterInfo {
  name: String,
  details: MonsterDetails
}

#[derive(Debug, Deserialize)]
pub struct MonsterDetails {
  aliases: Vec<String>,
  title: String,
  // #[serde(rename = "url")]
  // _url: String,
  description: String,
  // #[serde(rename = "thumbnail")]
  // _thumbnail: String,
  // #[serde(rename = "elements")]
  // _elements: Vec<String>,
  // #[serde(rename = "ailments")]
  // _ailments: Vec<String>,
  // #[serde(rename = "locations")]
  // _locations: Vec<MonsterLocation>,
  // #[serde(rename = "info")]
  // _info: String,
  hzv: MonsterHitzones,
  hzv_hr: Option<MonsterHitzones>,
  species: String,
  // #[serde(rename = "useful_info")]
  // _useful_info: String,
  // #[serde(rename = "resistances")]
  // _resistances: Vec<String>,
  // #[serde(rename = "weakness")]
  // _weakness: Vec<String>,
  icon_filepath: String,
  hzv_filepath: String,
  hzv_filepath_hr: Option<String>,
  threat_level: Option<String>
}

// #[derive(Debug, Deserialize)]
// pub struct MonsterLocation {
//   #[serde(rename = "name")]
//   _name: String,
//   #[serde(rename = "color")]
//   _color: String,
//   #[serde(rename = "icon")]
//   _icon: Option<String>,
//   #[serde(rename = "tempered")]
//   _tempered: Option<bool>
// }

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
