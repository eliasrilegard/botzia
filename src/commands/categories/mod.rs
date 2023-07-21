use super::NamedCommands;

mod dd;
mod mhw;
mod probability;
mod time;

pub fn commands() -> NamedCommands {
  vec![
    ("dd", Box::new(dd::DD::default())),
    ("mhw", Box::new(mhw::Mhw::default())),
    ("probability", Box::new(probability::Probability::default())),
    ("time", Box::new(time::Time::default()))
  ]
}