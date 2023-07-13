use super::NamedCommands;

mod poll;
mod spongetext;

pub fn commands() -> NamedCommands {
  vec![
    ("poll", Box::new(poll::Poll::default())),
    ("spongetext", Box::new(spongetext::SpongeText::default()))
  ]
}