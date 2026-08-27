import type { ExerciseVideoPlayerProps } from "./exercise-video-player.types";

export function ExerciseVideoPlayer({
  embedUrl,
  title,
  onReady,
  onError,
}: ExerciseVideoPlayerProps) {
  return (
    <iframe
      src={embedUrl}
      title={title}
      allow="fullscreen; picture-in-picture"
      onLoad={onReady}
      onError={onError}
      style={{
        width: "100%",
        minHeight: 220,
        border: 0,
        borderRadius: 18,
      }}
    />
  );
}
