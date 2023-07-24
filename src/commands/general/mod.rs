use super::NamedCommands;

mod avatar;
mod commandstats;
mod poll;
mod remindme;
mod snowflake;
mod spongetext;
mod trivia;

pub fn commands() -> NamedCommands {
  vec![
    ("avatar", Box::<avatar::Avatar>::default()),
    ("commandstats", Box::<commandstats::CommandStats>::default()),
    ("poll", Box::<poll::Poll>::default()),
    ("remindme", Box::<remindme::RemindMe>::default()),
    ("snowflake", Box::<snowflake::Snowflake>::default()),
    ("spongetext", Box::<spongetext::SpongeText>::default()),
    ("trivia", Box::<trivia::Trivia>::default())
  ]
}