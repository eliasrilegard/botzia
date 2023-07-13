use super::NamedCommands;

mod dd;
mod probability;
mod time;

pub fn commands() -> NamedCommands {
  vec![
    ("dd", Box::new(dd::DD::default())),
    ("probability", Box::new(probability::Probability::default())),
    ("time", Box::new(time::Time::default()))
  ]
}