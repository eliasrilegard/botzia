const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

const units = new Map([
  // Temperature
  ['C', {
    name: 'Celsius',
    conversions: [
      { unit: 'F', name: 'Fahrenheit', conversion: t => t * 9/5 + 32 },
      { unit: 'K', name: 'Kelvin', conversion: t => Number(t) + 272.15 }
    ]
  }],
  ['F', {
    name: 'Fahrenheit',
    conversions: [
      { unit: 'C', name: 'Celsius', conversion: t => (t - 32) * 5/9 },
      { unit: 'K', name: 'Kelvin', conversion: t => (t - 32) * 5/9 + 272.15 }
    ]
  }],
  ['K', {
    name: 'Kelvin',
    conversions: [
      { unit: 'C', name: 'Celsius', conversion: t => t - 272.15 },
      { unit: 'F', name: 'Fahrenheit', conversion: t => (t - 272.15) * 9/5 + 32 }
    ]
  }]
]);

class UnitConvert extends Command {
  constructor() {
    super('unitconvert', 'Convert a measure from one unit to another!', '[value] [unit from] [unit to]', { aliases: ['convert'] });
  }
  
  async execute(message, args, client) {
    // Maybe check args.length?

    const embed = new MessageEmbed().setColor('cc0000');

    const valueBase = args[0];
    if (!valueBase.match(/^-?\d+(\.\d+)?$/g)) {
      embed
        .setTitle('Invalid value')
        .setDescription('Unable to resolve the value.')
        .addField('Command usage', this.howTo(client.prefix(), true));
      return message.channel.send({ embeds: [embed] });
    }

    const unitBase = args[1];
    const unitGoal = args[2];
    const baseObj = units.get(unitBase.toUpperCase());

    if (!baseObj) {
      embed
        .setTitle('Invalid base unit')
        .setDescription('Unable to identify base unit.')
        .addField('Command usage', this.howTo(client.prefix(), true))
      return message.channel.send({ embeds: [embed] });
    }
      
    const baseName = baseObj.name;
    const goalMatches = baseObj.conversions.filter(obj => obj.unit == unitGoal.toUpperCase());
    
    if (goalMatches.length == 0) {
      embed
        .setTitle('Invalid goal unit')
        .setDescription('Unable to identify goal unit.')
        .addField('Command usage', this.howTo(client.prefix(), true))
      return message.channel.send({ embeds: [embed] });
    }

    const goalName = goalMatches[0].name;
    const conversion = goalMatches[0].conversion;
    const valueConverted = Math.round((conversion(valueBase) + Number.EPSILON) * 100) / 100;

    embed
      .setColor('0066cc')
      .setTitle(`${valueBase} ${baseName} is ${valueConverted} ${goalName}`)
    message.channel.send({ embeds: [embed] });
  }
}

module.exports = UnitConvert;