use super::NamedSubCommands;

mod howlucky;
mod howmanyruns;

pub fn commands() -> NamedSubCommands {
  vec![
    ("howlucky", Box::new(howlucky::HowLucky::default())),
    ("howmanyruns", Box::new(howmanyruns::HowManyRuns::default()))
  ]
}