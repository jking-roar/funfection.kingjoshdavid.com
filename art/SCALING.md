# Family depiction scaling

Default icon scales (2), before seeded size variation or explicit overrides.

| Instance count | Plate multiplier |
| --- | ---: |
| 1 | 0.95 |
| 2 | 0.80 |
| 3 | 0.68 |
| 4 | 0.60 |
| 5 | 0.55 |
| 6 | 0.51 |
| 7 | 0.48 |
| 8 | 0.45 |
| 9 | 0.42 |

Body fit multiplies native SVG coordinates, then the plate multiplier applies. Body size varies ±4% internally and plate size varies ±4%. Lattice and Nexus use a specimen-sized native frame and an additional 0.65 plate fit.

Adornments normalize each suffix by its native gesture radius. Nominal plate radius is at least 18 / 0.92 = 19.57 units before ±8% detail variation, ensuring an 18-unit floor at the smallest variation. One plate is 800 × 800 units. Family and suffix scale overrides remain respected. The radii below exclude seeded variation and use the exact configured values; at other counts substitute the corresponding plate multiplier.

| Family | Body fit | Local base adornment radius | Plate radius, 1 instance | Plate radius, 9 instances |
| --- | ---: | ---: | ---: | ---: |
| Aether | 2.429 | 21.0 | 48.4 | 21.4 |
| Axon | 2.267 | 19.5 | 42.0 | 19.6 |
| Bloom | 2.615 | 24.0 | 59.6 | 26.4 |
| Bramble | 2.267 | 25.5 | 54.9 | 24.3 |
| Byway | 2.615 | 21.0 | 52.2 | 23.1 |
| Cinder | 3.542 | 19.5 | 65.6 | 29.0 |
| Cwm | 2.267 | 21.0 | 45.2 | 20.0 |
| Djin | 2.615 | 22.5 | 55.9 | 24.7 |
| Drizzle | 3.542 | 18.0 | 60.6 | 26.8 |
| Echo | 2.429 | 25.5 | 58.8 | 26.0 |
| Eddy | 2.742 | 22.5 | 58.6 | 25.9 |
| Ember | 2.615 | 21.0 | 52.2 | 23.1 |
| Fable | 2.833 | 21.0 | 56.5 | 25.0 |
| Fjord | 2.615 | 21.0 | 52.2 | 23.1 |
| Glimmer | 3.542 | 19.5 | 65.6 | 29.0 |
| Glitch | 2.615 | 19.5 | 48.4 | 21.4 |
| Gyoza | 2.833 | 22.5 | 60.6 | 26.8 |
| Hollow | 2.833 | 24.0 | 64.6 | 28.6 |
| Hyrax | 2.615 | 21.0 | 52.2 | 23.1 |
| Ibex | 2.125 | 19.5 | 39.4 | 19.6 |
| Icicle | 2.429 | 18.0 | 41.5 | 19.6 |
| Jowl | 2.742 | 24.0 | 62.5 | 27.6 |
| Jumble | 2.742 | 21.0 | 54.7 | 24.2 |
| Kindle | 2.615 | 22.5 | 55.9 | 24.7 |
| Krait | 2.179 | 19.5 | 40.4 | 19.6 |
| Lattice | 0.650* | 56.0† | 34.6 | 19.6 |
| Lyric | 2.931 | 19.5 | 54.3 | 24.0 |
| Mirth | 3.778 | 21.0 | 75.4 | 33.3 |
| Murmur | 3.091 | 19.5 | 57.3 | 25.3 |
| Myrrh | 2.931 | 22.5 | 62.7 | 27.7 |
| Nexus | 0.650* | 18.0 | 19.6 | 19.6 |
| Nimbus | 2.267 | 24.0 | 51.7 | 22.8 |
| Oracle | 2.615 | 21.0 | 52.2 | 23.1 |
| Oxbow | 2.429 | 21.0 | 48.4 | 21.4 |
| Pollen | 3.778 | 18.0 | 64.6 | 28.6 |
| Pulse | 2.615 | 22.5 | 55.9 | 24.7 |
| Pylon | 2.615 | 21.0 | 52.2 | 23.1 |
| Quark | 2.833 | 19.5 | 52.5 | 23.2 |
| Quiver | 2.833 | 19.5 | 52.5 | 23.2 |
| Rhyme | 2.833 | 21.0 | 56.5 | 25.0 |
| Ripple | 2.429 | 21.0 | 48.4 | 21.4 |
| Skald | 2.267 | 21.0 | 45.2 | 20.0 |
| Spark | 2.833 | 24.0 | 64.6 | 28.6 |
| Sprocket | 3.091 | 21.0 | 61.7 | 27.3 |
| Tangle | 2.125 | 22.5 | 45.4 | 20.1 |
| Tizzy | 2.931 | 21.0 | 58.5 | 25.9 |
| Umber | 2.615 | 21.0 | 52.2 | 23.1 |
| Uvula | 2.833 | 19.5 | 52.5 | 23.2 |
| Velour | 2.833 | 19.5 | 52.5 | 23.2 |
| Voxel | 3.542 | 19.5 | 65.6 | 29.0 |
| Wobble | 3.091 | 24.0 | 70.5 | 31.2 |
| Wrack | 2.931 | 21.0 | 58.5 | 25.9 |
| Xebec | 2.125 | 19.5 | 39.4 | 19.6 |
| Xyloid | 2.125 | 22.5 | 45.4 | 20.1 |
| Yolk | 2.833 | 21.0 | 56.5 | 25.0 |
| Yonder | 2.125 | 21.0 | 42.4 | 19.6 |
| Zephyr | 2.361 | 21.0 | 47.1 | 20.8 |
| Zymic | 2.125 | 19.5 | 39.4 | 19.6 |

* Lattice/Nexus fit is their extra specimen-frame multiplier; their regular family scale is 1. Lattice’s additional seeded mesh scale is canceled in the adornment radius.

† Lattice radius is 56 in specimen space before its extra 0.65 fitting and count scaling; the minimum final adornment floor still applies. Other families use the local radius at the recorded SVG landmark.
