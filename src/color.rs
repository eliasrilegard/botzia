pub enum Colors {
  Blue = 0x0066cc,
  Green = 0x00cc00,
  Orange = 0xcc6600,
  Red = 0xcc0000
}

use serenity::utils::Color as SerenityColor;

impl From<Colors> for SerenityColor {
  fn from(val: Colors) -> Self {
    SerenityColor::new(val as u32)
  }
}