/* Scale values are relative to the original artwork: 1 = original, 2 = double.
 * Each named category override replaces the shared default, rather than multiplying it.
 * Example: categories.family.Lattice = 1.5;
 * Example: categories.prefix.Frosty = 3;
 * Example: categories.suffix.Crackle = 1;
 */
(function (root) {
  'use strict';
  const config = {
    iconScale: 2,
    categories: { prefix: {}, family: {}, suffix: {} },
  };
  root.FunfectionArtConfig = config;
  if (typeof module !== 'undefined') module.exports = config;
})(globalThis);
