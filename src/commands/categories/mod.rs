use super::NamedCommands;

mod time;

pub fn commands() -> NamedCommands {
  vec![
    ("time", Box::new(time::Time::default()))
  ]
}