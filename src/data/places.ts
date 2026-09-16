export type Place = {
  id: string;
  title: string;
  description: string;
  coordinates: [number, number];
  category?: string;
  badges: string[];
};

export const places: Place[] = [
  {
    id: 'massachusetts-hall',
    title: 'Massachusetts Hall',
    description:
      'Built in 1718, Massachusetts Hall is the oldest surviving building at Harvard.',
    coordinates: [-71.1182833, 42.3744389],
    category: 'Historic Site',
    badges: [],
  },
  {
    id: 'john-harvard-statue',
    title: 'John Harvard Statue',
    description:
      'The statue is commonly called the Statue of Three Lies because its inscription contains three historical inaccuracies.',
    coordinates: [-71.11718, 42.37443],
    category: 'Monument',
    badges: [],
  },
  {
    id: 'widener-library',
    title: 'Widener Library',
    description:
      'Widener Library is the central library of the Harvard Library system.',
    coordinates: [-71.11633, 42.373973],
    category: 'Library',
    badges: [],
  },
];