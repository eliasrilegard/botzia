use super::NamedCommands;

mod avatar;
mod poll;
mod spongetext;

pub fn commands() -> NamedCommands {
  vec![
    ("avatar", Box::new(avatar::Avatar::default())),
    ("poll", Box::new(poll::Poll::default())),
    ("spongetext", Box::new(spongetext::SpongeText::default()))
  ]
}