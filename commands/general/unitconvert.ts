import { EmbedBuilder, Message } from 'discord.js';
import DWG from 'directed-weighted-graph';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

interface Unit {
  readonly name: string;
  readonly category: string;
  readonly aliases?: Array<string>;
}

type convertFn = (x: number) => number;

// A wrapper class for the DWG class, adapted for use with Units
class UnitStore {
  private readonly graph: DWG<Unit, convertFn>;

  constructor(input?: Array<[Unit, Array<[string, convertFn]>]>) {
    this.graph = new DWG();
    
    if (!input) return;
    
    // Add all units to the graph first
    for (const entry of input) this.graph.addVertex(entry[0]); // entry[0] has the base unit

    // Go through every connection and add as necessary
    for (const [baseUnit, destUnits] of input) {
      for (const [goalName, conversion] of destUnits) {
        const goalUnits = this.graph.find(v => (v.aliases ? [v.name, ...v.aliases] : [v.name]).includes(goalName));
        for (const goalUnit of goalUnits) this.graph.addEdge(baseUnit, goalUnit, conversion);
      }
    }
  }

  getUnits(name: string): Array<Unit> {
    return this.graph.find(unit => {
      const searchList = (unit.aliases ? [unit.name, ...unit.aliases] : [unit.name]).map(str => str.toLowerCase());
      return searchList.includes(name.toLowerCase());
    });
  }

  getConversion(unit1: Unit, unit2: Unit): convertFn | null {
    if (!this.graph.has(unit1) || !this.graph.has(unit2)) return null;
    return this.graph.getWeight(unit1, unit2);
  }

  getUnitList(): Array<{ name: string, category: string }> {
    const allUnits = this.graph.getAllVertices();
    return allUnits.map(unit => {
      return { name: unit.name, category: unit.category };
    });
  }

  isSameType(unit1: Unit, unit2: Unit): boolean {
    const foundUnits = this.graph.getEdges(unit1)!.find(u => u[0] === unit2);
    return foundUnits !== undefined;
  }
}

export default class UnitConvert extends TextCommand {
  private readonly unitStore: UnitStore;

  constructor(client: Bot) {
    super(
      client,
      'unitconvert',
      'Convert a measure from one unit to another!',
      ['[value] [unit from] [unit to]', '--list'],
      { aliases: ['convert'] }
    );

    this.unitStore = new UnitStore([
      // Temperature
      [{
        name: 'Celsius',
        category: 'Temperature',
        aliases: ['C']
      }, [
        ['F', t => t * 9 / 5 + 32],
        ['K', t => t + 272.15]
      ]],
      [{
        name: 'Fahrenheit',
        category: 'Temperature',
        aliases: ['F']
      }, [
        ['C', t => (t - 32) * 5 / 9],
        ['K', t => (t - 32) * 5 / 9 + 273.15]
      ]],
      [{
        name: 'Kelvin',
        category: 'Temperature',
        aliases: ['K']
      }, [
        ['C', t => t - 273.15],
        ['F', t => (t - 273.15) * 9 / 5 + 32]
      ]],
      // Length
      [{
        name: 'Meters',
        category: 'Length',
        aliases: ['Meter', 'Metre', 'Metres', 'm']
      }, [
        ['km', l => l / 1000],
        ['ft', l => l / 0.3048],
        ['mi', l => l / 1609.344]
      ]],
      [{
        name: 'Kilometers',
        category: 'Length',
        aliases: ['Kilometer', 'Kilometre', 'Kilometres', 'km']
      }, [
        ['m', l => l * 1000],
        ['ft', l => l / 0.0003048],
        ['mi', l => l / 1.609344]
      ]],
      [{
        name: 'Feet',
        category: 'Length',
        aliases: ['Foot', 'ft']
      }, [
        ['m', l => l * 0.3048],
        ['km', l => l * 0.0003048],
        ['mi', l => l / 5280]
      ]],
      [{
        name: 'Miles',
        category: 'Length',
        aliases: ['Mile', 'mi']
      }, [
        ['m', l => l * 1609.344],
        ['km', l => l * 1.609344],
        ['ft', l => l * 5280]
      ]],
      // Mass
      [{
        name: 'Kilograms',
        category: 'Mass',
        aliases: ['Kilogram', 'kg', 'kgs']
      }, [
        ['lb', m => m * 2.20462262],
        ['oz', m => m * 35.2739619]
      ]],
      [{
        name: 'Pounds',
        category: 'Mass',
        aliases: ['Pound', 'lb', 'lbs']
      }, [
        ['kg', m => m * 0.45359237],
        ['oz', m => m * 16]
      ]],
      [{
        name: 'Ounces',
        category: 'Mass',
        aliases: ['Ounce', 'oz']
      }, [
        ['kg', m => m * 0.02834952],
        ['lb', m => m * 0.0625]
      ]],
      // Volume
      [{
        name: 'Liters',
        category: 'Volume',
        aliases: ['Liter', 'Litre', 'Litres', 'l']
      }, [
        ['gal', v => v * 0.264172],
        ['floz', v => v * 33.814]
      ]],
      [{
        name: 'Gallons',
        category: 'Volume',
        aliases: ['Gallon', 'gal']
      }, [
        ['l', v => v / 0.264172],
        ['floz', v => v * 128]
      ]],
      [{
        name: 'FluidOunces',
        category: 'Volume',
        aliases: ['FluidOunce', 'FluidOz', 'floz']
      }, [
        ['l', v => v * 0.0295735],
        ['gal', v => v * 0.0078125]
      ]]
    ]);
  }

  async execute(message: Message, args: Array<string>): Promise<void> {    
    const prefix = await this.client.prefix(message);
    const embed = new EmbedBuilder().setColor(this.client.config.colors.RED);

    if (args[0] === '--list') {
      // Use with .filter to filter out uniques in array
      const uniques = (value: string, index: number, list: Array<string>): boolean => list.indexOf(value) === index;

      const unitList = this.unitStore.getUnitList();
      const categories = unitList.map(unit => unit.category).filter(uniques);
      const fields = categories.map(category => {
        return {
          name: category,
          value: unitList.filter(unit => unit.category === category).map(unit => unit.name).join('\n')
        };
      });
      embed
        .setColor(this.client.config.colors.BLUE)
        .setTitle('Avalible units')
        .setDescription('Here\'s a list of all supported units.')
        .addFields(fields)
        .setFooter({ text: 'I should have most abbreviations covered too. Let me know if there\'s one missing.' });
      message.channel.send({ embeds: [embed] });
      return;
    }

    const valueBase = args[0];
    if (!valueBase.match(/^-?\d+(\.\d+)?$/g)) {
      embed
        .setTitle('Invalid value')
        .setDescription('Unable to resolve the value.')
        .addFields({ name: 'Command usage', value: this.howTo(prefix, true) });
      message.channel.send({ embeds: [embed] });
      return;
    }
    
    if (args.length !== 3) {
      embed
        .setTitle('Invalid arguments')
        .setDescription('This command takes 3 arguments.')
        .addFields({ name: 'Command usage', value: this.howTo(prefix, true) });
      message.channel.send({ embeds: [embed] });
      return;
    }

    const baseUnit = this.unitStore.getUnits(args[1])[0];
    const goalUnit = this.unitStore.getUnits(args[2])[0];
    
    if (!baseUnit) {
      embed
        .setTitle('Invalid base unit')
        .setDescription('Unable to identify base unit.')
        .addFields({ name: 'Command usage', value: this.howTo(prefix, true) });
      message.channel.send({ embeds: [embed] });
      return;
    }

    if (!goalUnit) {
      embed
        .setTitle('Invalid goal unit')
        .setDescription('Unable to identify goal unit.')
        .addFields({ name: 'Command usage', value: this.howTo(prefix, true) });
      message.channel.send({ embeds: [embed] });
      return;
    }

    if (!this.unitStore.isSameType(baseUnit, goalUnit)) { // Rework base package
      embed.setTitle('Units are not of same type');
      message.channel.send({ embeds: [embed] });
      return;
    }
      
    const conversionFn = this.unitStore.getConversion(baseUnit, goalUnit)!;
    const valueConverted = Math.round((conversionFn(Number(valueBase)) + Number.EPSILON) * 100) / 100;

    embed
      .setColor(this.client.config.colors.BLUE)
      .setTitle(`${valueBase} ${baseUnit.name} is ${valueConverted} ${goalUnit.name}`);
    message.channel.send({ embeds: [embed] });
  }
}