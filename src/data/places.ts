export type Place = {
  id: string;
  title: string;
  description: string;
  coordinates: [number, number];
};

export const places: Place[] = [
  {
    id: 'massachusetts-hall',
    title: 'Massachusetts Hall',
    description:
      'Built in 1718, Massachusetts Hall is the oldest surviving building at Harvard.',
    coordinates: [-71.1182833, 42.3744389],
  },
  {
    id: 'john-harvard-statue',
    title: 'John Harvard Statue',
    description:
      'The statue is commonly called the Statue of Three Lies because its inscription contains three historical inaccuracies.',
    coordinates: [-71.11718, 42.37443],
  },
  {
    id: 'widener-library',
    title: 'Widener Library',
    description:
      'Widener Library is the central library of the Harvard Library system.',
    coordinates: [-71.11633, 42.373973],
  },
];