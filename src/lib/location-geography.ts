import type { Place } from '@/data/places';

function normalized(value: string | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function uniqueSorted(values: (string | undefined)[]) {
  const byNormalizedValue = new Map<string, string>();

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const key = normalized(trimmed);
    if (!byNormalizedValue.has(key)) {
      byNormalizedValue.set(key, trimmed);
    }
  }

  return [...byNormalizedValue.values()].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function getLocationStateOptions(places: Place[]) {
  return uniqueSorted(places.map((place) => place.state));
}

export function getLocationCityOptions(
  places: Place[],
  selectedState: string,
) {
  return uniqueSorted(
    places
      .filter(
        (place) =>
          !selectedState || normalized(place.state) === normalized(selectedState),
      )
      .map((place) => place.city),
  );
}

export function placeMatchesGeography(
  place: Place,
  selectedState: string,
  selectedCity: string,
) {
  return (
    (!selectedState || normalized(place.state) === normalized(selectedState)) &&
    (!selectedCity || normalized(place.city) === normalized(selectedCity))
  );
}

export function getPlaceLocality(place: Place) {
  return [place.city, place.state]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ');
}
