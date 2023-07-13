pub enum Colors {
  BLUE = 0x0066cc,
  GREEN = 0x00cc00,
  ORANGE = 0xcc6600,
  RED = 0xcc0000
}

use serenity::utils::Color as SerenityColor;

impl Into<SerenityColor> for Colors {
  fn into(self) -> SerenityColor {
    SerenityColor::new(self as u32)
  }
}