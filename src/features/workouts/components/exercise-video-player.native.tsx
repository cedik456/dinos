import { WebView } from "react-native-webview";

import type { ExerciseVideoPlayerProps } from "./exercise-video-player.types";
import { nativeExerciseVideoSource } from "./exercise-video-player-html";

export function ExerciseVideoPlayer({
  embedUrl,
  title,
  onReady,
  onError,
}: ExerciseVideoPlayerProps) {
  return (
    <WebView
      accessibilityLabel={title}
      source={nativeExerciseVideoSource(embedUrl, title)}
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction
      onLoad={onReady}
      onError={onError}
      onHttpError={onError}
      style={{ minHeight: 220, borderRadius: 18, overflow: "hidden" }}
    />
  );
}
