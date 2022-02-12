import { GuildMember } from 'discord.js';

// A utility class with common functions required by some modules to run.

class Utils {
  public static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  public static permHierarchy(memberHigh: GuildMember, memberLow: GuildMember): boolean {
    // Returns true if memberHigh is higher or equal to memberLow in the role hierarchy
    return memberLow.roles.highest.comparePositionTo(memberHigh.roles.highest) < 1;
  }

  public static shuffle(array: Array<unknown>): Array<unknown> {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }
}

export default Utils;