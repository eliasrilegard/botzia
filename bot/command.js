const defaultOptions = {
  args: true,
  devOnly: false,
  aliases: [],
  permissions: false,
  guildOnly: false,
  cooldown: 3000
};

class Command {
  constructor(name, description, usage, customOptions) {
    const options = { ...defaultOptions, ...customOptions };
    this.name = name;
    this.description = description;
    this.usage = `${usage}`;
    this.args = options['args'];
    this.devOnly = options['devOnly'];
    this.aliases = options['aliases'];
    this.permissions = options['permissions'];
    this.guildOnly = options['guildOnly'];
    this.cooldown = options['cooldown'];
    this.cooldowns = new Map();
  }
}

module.exports = Command;