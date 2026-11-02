export type AvatarMaskStamp = {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
};

export type AvatarMaskOverrides = Partial<Record<string, AvatarMaskStamp[]>>;

export function isAvatarMaskStamp(value: unknown): value is AvatarMaskStamp {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const stamp = value as Record<string, unknown>;

  return ['x', 'y', 'radiusX', 'radiusY'].every(
    (key) => typeof stamp[key] === 'number' && Number.isFinite(stamp[key]),
  );
}

export function buildAvatarMaskShapeMarkup(
  stamps: AvatarMaskStamp[],
  canvasSize: number,
) {
  return stamps
    .map(
      (stamp) =>
        `<ellipse cx="${(stamp.x / 100) * canvasSize}" cy="${(stamp.y / 100) * canvasSize}" rx="${(stamp.radiusX / 100) * canvasSize}" ry="${(stamp.radiusY / 100) * canvasSize}" fill="black" />`,
    )
    .join('\n  ');
}

export function buildAvatarMaskSvg(
  itemName: string,
  stamps: AvatarMaskStamp[],
  canvasSize: number,
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
  <title>${itemName} occlusion mask</title>
  <rect width="${canvasSize}" height="${canvasSize}" fill="white" />
  ${buildAvatarMaskShapeMarkup(stamps, canvasSize)}
</svg>`;
}
