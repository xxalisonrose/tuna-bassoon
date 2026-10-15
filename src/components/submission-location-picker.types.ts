export type SubmissionCoordinates = [longitude: number, latitude: number];

export type SubmissionLocationPickerProps = {
  center: SubmissionCoordinates;
  selectedCoordinates: SubmissionCoordinates | null;
  onSelect: (coordinates: SubmissionCoordinates) => void;
};
