import { GuildMember } from 'discord.js';

// A utility class with common functions required by some modules to run.

export default class Utils {
  /**
   * Capitalizes the first letter of a given string.
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Compares the highest permissions of two given members.
   * @returns `true` if memberHigh is higher or equal to memberLow in the role hierarchy.
   */
  static permHierarchy(memberHigh: GuildMember, memberLow: GuildMember): boolean {
    return memberLow.roles.highest.comparePositionTo(memberHigh.roles.highest) < 1;
  }

  /**
   * Shuffles the passed array.
   */
  static shuffle<T>(array: Array<T>): Array<T> {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}