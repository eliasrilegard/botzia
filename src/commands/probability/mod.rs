use super::NamedSubCommands;

mod howlucky;
mod howmanyruns;

pub fn commands() -> NamedSubCommands {
  vec![
    ("howlucky", Box::<howlucky::HowLucky>::default()),
    ("howmanyruns", Box::<howmanyruns::HowManyRuns>::default()),
  ]
}
