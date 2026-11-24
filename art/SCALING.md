# Family depiction scaling

Default icon scales (2), before seeded size variation or explicit overrides.

| Instance count | Plate multiplier |
| --- | ---: |
| 1 | 0.95 |
| 2 | 0.86 |
| 3 | 0.80 |
| 4 | 0.75 |
| 5 | 0.71 |
| 6 | 0.68 |
| 7 | 0.65 |
| 8 | 0.62 |
| 9 | 0.60 |

Body fit multiplies native SVG coordinates, then the plate multiplier applies. Body size varies ±4% internally and plate size varies ±4%, clamped to a minimum final multiplier of 0.60. Lattice and Nexus use a specimen-sized native frame and an additional 0.65 plate fit.

Adornments normalize each suffix by its native gesture radius. Nominal plate radius is at least 18 / 0.92 = 19.57 units before ±8% detail variation, ensuring an 18-unit floor at the smallest variation. One plate is 800 × 800 units. Family and suffix scale overrides remain respected. The radii below exclude seeded variation and use the exact configured values; at other counts substitute the corresponding plate multiplier.

| Family | Body fit | Local base adornment radius | Plate radius, 1 instance | Plate radius, 9 instances |
| --- | ---: | ---: | ---: | ---: |
| Aether | 2.429 | 21.0 | 48.4 | 30.6 |
| Axon | 2.267 | 19.5 | 42.0 | 26.5 |
| Bloom | 2.615 | 24.0 | 59.6 | 37.7 |
| Bramble | 2.267 | 25.5 | 54.9 | 34.7 |
| Byway | 2.615 | 21.0 | 52.2 | 33.0 |
| Cinder | 3.542 | 19.5 | 65.6 | 41.4 |
| Cwm | 2.267 | 21.0 | 45.2 | 28.6 |
| Djin | 2.615 | 22.5 | 55.9 | 35.3 |
| Drizzle | 3.542 | 18.0 | 60.6 | 38.3 |
| Echo | 2.429 | 25.5 | 58.8 | 37.2 |
| Eddy | 2.742 | 22.5 | 58.6 | 37.0 |
| Ember | 2.615 | 21.0 | 52.2 | 33.0 |
| Fable | 2.833 | 21.0 | 56.5 | 35.7 |
| Fjord | 2.615 | 21.0 | 52.2 | 33.0 |
| Glimmer | 3.542 | 19.5 | 65.6 | 41.4 |
| Glitch | 2.615 | 19.5 | 48.4 | 30.6 |
| Gyoza | 2.833 | 22.5 | 60.6 | 38.3 |
| Hollow | 2.833 | 24.0 | 64.6 | 40.8 |
| Hyrax | 2.615 | 21.0 | 52.2 | 33.0 |
| Ibex | 2.125 | 19.5 | 39.4 | 24.9 |
| Icicle | 2.429 | 18.0 | 41.5 | 26.2 |
| Jowl | 2.742 | 24.0 | 62.5 | 39.5 |
| Jumble | 2.742 | 21.0 | 54.7 | 34.5 |
| Kindle | 2.615 | 22.5 | 55.9 | 35.3 |
| Krait | 2.179 | 19.5 | 40.4 | 25.5 |
| Lattice | 0.650* | 56.0† | 34.6 | 21.8 |
| Lyric | 2.931 | 19.5 | 54.3 | 34.3 |
| Mirth | 3.778 | 21.0 | 75.4 | 47.6 |
| Murmur | 3.091 | 19.5 | 57.3 | 36.2 |
| Myrrh | 2.931 | 22.5 | 62.7 | 39.6 |
| Nexus | 0.650* | 18.0 | 19.6 | 19.6 |
| Nimbus | 2.267 | 24.0 | 51.7 | 32.6 |
| Oracle | 2.615 | 21.0 | 52.2 | 33.0 |
| Oxbow | 2.429 | 21.0 | 48.4 | 30.6 |
| Pollen | 3.778 | 18.0 | 64.6 | 40.8 |
| Pulse | 2.615 | 22.5 | 55.9 | 35.3 |
| Pylon | 2.615 | 21.0 | 52.2 | 33.0 |
| Quark | 2.833 | 19.5 | 52.5 | 33.1 |
| Quiver | 2.833 | 19.5 | 52.5 | 33.1 |
| Rhyme | 2.833 | 21.0 | 56.5 | 35.7 |
| Ripple | 2.429 | 21.0 | 48.4 | 30.6 |
| Skald | 2.267 | 21.0 | 45.2 | 28.6 |
| Spark | 2.833 | 24.0 | 64.6 | 40.8 |
| Sprocket | 3.091 | 21.0 | 61.7 | 38.9 |
| Tangle | 2.125 | 22.5 | 45.4 | 28.7 |
| Tizzy | 2.931 | 21.0 | 58.5 | 36.9 |
| Umber | 2.615 | 21.0 | 52.2 | 33.0 |
| Uvula | 2.833 | 19.5 | 52.5 | 33.1 |
| Velour | 2.833 | 19.5 | 52.5 | 33.1 |
| Voxel | 3.542 | 19.5 | 65.6 | 41.4 |
| Wobble | 3.091 | 24.0 | 70.5 | 44.5 |
| Wrack | 2.931 | 21.0 | 58.5 | 36.9 |
| Xebec | 2.125 | 19.5 | 39.4 | 24.9 |
| Xyloid | 2.125 | 22.5 | 45.4 | 28.7 |
| Yolk | 2.833 | 21.0 | 56.5 | 35.7 |
| Yonder | 2.125 | 21.0 | 42.4 | 26.8 |
| Zephyr | 2.361 | 21.0 | 47.1 | 29.8 |
| Zymic | 2.125 | 19.5 | 39.4 | 24.9 |

* Lattice/Nexus fit is their extra specimen-frame multiplier; their regular family scale is 1. Lattice’s additional seeded mesh scale is canceled in the adornment radius.

† Lattice radius is 56 in specimen space before its extra 0.65 fitting and count scaling; the minimum final adornment floor still applies. Other families use the local radius at the recorded SVG landmark.
