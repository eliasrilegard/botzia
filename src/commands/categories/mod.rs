use super::NamedCommands;

mod probability;
mod time;

pub fn commands() -> NamedCommands {
  vec![
    ("probability", Box::new(probability::Probability::default())),
    ("time", Box::new(time::Time::default()))
  ]
}