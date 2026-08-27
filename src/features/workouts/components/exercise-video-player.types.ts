export type ExerciseVideoPlayerProps = {
  embedUrl: string;
  title: string;
  onReady: () => void;
  onError: () => void;
};
