# Artwork Provenance and Replacement Register

This register tracks temporary artwork created with generative tools or other placeholder methods. Its purpose is to make replacement work visible and prevent placeholder art from quietly becoming permanent.

Only assets with confirmed provenance belong in a specific section. Do not guess how older artwork was created; record it as unknown until its source is confirmed.

## Confirmed AI-generated placeholders

| Asset | Current use | How it was created | Replacement plan |
| --- | --- | --- | --- |
| `assets/images/map-pins/other-discovery-unvisited.png` | Red unvisited discovery gem; currently the default map marker for every location family without custom artwork | Generated on October 9, 2026 with OpenAI image generation as a transparent, playful 3D game-map asset | Replace with final human-created or commissioned Other Discoveries artwork before the placeholder-art milestone is closed |
| `assets/images/map-pins/other-discovery-visited.png` | Green checked-in discovery gem; currently the default visited marker for every location family without custom artwork | Created on October 9, 2026 by recoloring the generated red gem while preserving its shape, lighting, crop, and transparency | Replace as a matched state pair with the final unvisited artwork |
| `assets/images/avatar/concepts/explorer-cow-concept-v1.png` | Approved visual-direction sheet for the future avatar system; not currently shown at runtime | Generated on October 13, 2026 with OpenAI image generation from Dan's original hand-drawn cow-avatar sketch and the agreed explorer direction | Replace with a human-created or commissioned character model sheet before final art is locked |
| `assets/images/avatar/references/avatar-neutral-reference.png` | Transparent neutral fitting reference for avatar proportions and clothing alignment; not currently shown at runtime | Generated on October 13, 2026 from the approved concept sheet and Dan's original sketch | Replace with a final human-drawn neutral body while preserving the 2048 template geometry and stable body ID |
| `assets/images/avatar/references/avatar-explorer-reference.png` | Transparent reference for the default explorer outfit; intended for prototype fitting and future avatar-page work | Generated on October 13, 2026 by dressing the approved neutral reference while preserving its pose and character design | Replace each visible clothing component with aligned human-created layers using the avatar art kit |

### Generation notes

The red gem prompt requested one isolated ruby-red faceted discovery gem with a strong silhouette, a transparent background, softly rounded low-poly facets, and enough clarity to remain legible at map-marker size. The green version used the red gem as its exact geometry reference and changed only the palette to emerald green.

Both current files are 256 × 256 transparent PNGs. They are intentionally treated as placeholders even though they are suitable for testing.

### Avatar reference notes

The avatar concept prompt requested a polished 2D character sheet derived from Dan's original sketch: a friendly upright cow with slightly lanky proportions, a long muzzle, visible horns and ears, black-and-cream markings, and a traditional explorer outfit. The neutral reference isolated the approved front-facing fitting pose on transparency. The explorer reference used that neutral image as its identity and alignment target, then added the approved field shirt, utility vest, cargo shorts, boots, neckerchief, glasses, and backpack.

The two transparent references are 1254 × 1254 PNGs. They are visual references rather than the canonical production canvas. `docs/avatar-art-guide.md` and the deterministic 2048 × 2048 SVG proportion guide define the dimensions and anchor positions for future final artwork.

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
