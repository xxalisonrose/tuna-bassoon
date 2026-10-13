# Artwork Provenance and Replacement Register

This register tracks temporary artwork created with generative tools or other placeholder methods. Its purpose is to make replacement work visible and prevent placeholder art from quietly becoming permanent.

Only assets with confirmed provenance belong in a specific section. Do not guess how older artwork was created; record it as unknown until its source is confirmed.

## Confirmed AI-generated placeholders

| Asset | Current use | How it was created | Replacement plan |
| --- | --- | --- | --- |
| `assets/images/map-pins/other-discovery-unvisited.png` | Red unvisited discovery gem; currently the default map marker for every location family without custom artwork | Generated on October 9, 2026 with OpenAI image generation as a transparent, playful 3D game-map asset | Replace with final human-created or commissioned Other Discoveries artwork before the placeholder-art milestone is closed |
| `assets/images/map-pins/other-discovery-visited.png` | Green checked-in discovery gem; currently the default visited marker for every location family without custom artwork | Created on October 9, 2026 by recoloring the generated red gem while preserving its shape, lighting, crop, and transparency | Replace as a matched state pair with the final unvisited artwork |

### Generation notes

The red gem prompt requested one isolated ruby-red faceted discovery gem with a strong silhouette, a transparent background, softly rounded low-poly facets, and enough clarity to remain legible at map-marker size. The green version used the red gem as its exact geometry reference and changed only the palette to emerald green.

Both current files are 256 × 256 transparent PNGs. They are intentionally treated as placeholders even though they are suitable for testing.

## Provenance awaiting confirmation

No other repository artwork has been added here yet. Older bundled badge images, administrator uploads, icons from installed libraries, and code-drawn interface controls should not be labeled AI-generated without confirmation.

## Requirements for replacement map artwork

- Provide coordinated unvisited and visited states.
- Remain recognizable at approximately 36–52 pixels on a phone map.
- Use a transparent background and a clear silhouette.
- Preserve or deliberately update the current asset registration and map-layer references.
- Test on physical iOS and Android devices at multiple zoom levels.
- Record the artist, source, license or permission, creation date, and final file path in this register.

## Adding future placeholders

For each new placeholder, record its repository path, where it appears, how it was created, the date it was introduced, and the intended replacement. Move an entry out of the placeholder list only after the replacement is in the application and has been tested.
