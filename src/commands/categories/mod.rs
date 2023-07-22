use super::NamedCommands;

mod dd;
mod mhw;
mod probability;
mod time;

pub fn commands() -> NamedCommands {
  vec![
    ("dd", Box::<dd::DD>::default()),
    ("mhw", Box::<mhw::Mhw>::default()),
    ("probability", Box::<probability::Probability>::default()),
    ("time", Box::<time::Time>::default())
  ]
}