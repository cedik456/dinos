import { useEffect, useState } from "react";
import { Image, Linking } from "react-native";

import { Text, View } from "@/components/ui/tw";
import type { WorkoutDetail } from "@/features/workouts/workout-api";
import {
  WorkoutButton,
  WorkoutMessage,
} from "@/features/workouts/components/workout-ui";
import { colors } from "@/theme/tokens";

import { ExerciseVideoPlayer } from "./exercise-video-player";

type Exercise = WorkoutDetail["exercises"][number];

function embedUrl(exercise: Exercise): string | null {
  if (!exercise.video) return null;
  return exercise.video.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${exercise.video.videoId}?playsinline=1`
    : `https://player.vimeo.com/video/${exercise.video.videoId}?dnt=1`;
}

export function ExerciseDemonstration({ exercise }: { exercise: Exercise }) {
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const videoEmbedUrl = embedUrl(exercise);

  useEffect(() => {
    if (!playing || ready || failed) return;
    const timer = setTimeout(() => setFailed(true), 10_000);
    return () => clearTimeout(timer);
  }, [failed, playing, ready]);

  const frames = exercise.illustrationFrames ?? [];
  const fallbackFrame = frames[0] ?? null;
  const showFallback = !videoEmbedUrl || failed;

  return (
    <View className="gap-md">
      {!playing && videoEmbedUrl && !failed ? (
        <WorkoutButton
          label="Play demonstration"
          variant="secondary"
          accessibilityLabel={`Play ${exercise.name} demonstration video`}
          onPress={() => setPlaying(true)}
        />
      ) : null}
      {playing && videoEmbedUrl && !failed ? (
        <ExerciseVideoPlayer
          embedUrl={videoEmbedUrl}
          title={`${exercise.name} demonstration`}
          onReady={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
      {failed ? (
        <WorkoutMessage
          tone="stale"
          title="Video unavailable"
          message="Use the illustrated movement sequence below."
        />
      ) : null}
      {showFallback && fallbackFrame ? (
        <View className="items-center">
          <Image
            source={{ uri: fallbackFrame.url }}
            accessibilityLabel={`${exercise.name} demonstration illustration`}
            resizeMode="contain"
            style={{
              width: 256,
              height: 256,
              borderRadius: 18,
              backgroundColor: colors.accent,
            }}
          />
        </View>
      ) : null}
      {exercise.illustrationAttribution || exercise.video ? (
        <WorkoutButton
          label={showCredits ? "Hide sources" : "Sources and credits"}
          variant="ghost"
          onPress={() => setShowCredits((value) => !value)}
        />
      ) : null}
      {showCredits ? (
        <View className="gap-sm rounded-medium bg-background p-md">
          {exercise.illustrationAttribution ? (
            <>
              <Text className="font-sans text-caption text-muted">
                Illustrations by {exercise.illustrationAttribution.creator} ·{" "}
                {exercise.illustrationAttribution.license}
              </Text>
              <WorkoutButton
                label="Open illustration license"
                variant="ghost"
                onPress={() =>
                  void Linking.openURL(
                    exercise.illustrationAttribution!.licenseUrl,
                  )
                }
              />
            </>
          ) : null}
          {exercise.video ? (
            <>
              <Text className="font-sans text-caption text-muted">
                Video by {exercise.video.creatorName}
              </Text>
              <WorkoutButton
                label="Open video source"
                variant="ghost"
                onPress={() => void Linking.openURL(exercise.video!.sourceUrl)}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
