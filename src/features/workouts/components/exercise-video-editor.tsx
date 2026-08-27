import { useEffect, useState } from "react";

import { Pressable, Text, View } from "@/components/ui/tw";
import type { ExerciseVideo } from "@/features/workouts/template-api";
import type { WorkoutActor } from "@/features/workouts/workout-auth";
import {
  usePreviewExerciseVideo,
  useRemoveExerciseVideo,
  useSaveExerciseVideo,
} from "@/features/workouts/template-queries";
import {
  WorkoutButton,
  WorkoutField,
  WorkoutMessage,
} from "@/features/workouts/components/workout-ui";

import { ExerciseVideoPlayer } from "./exercise-video-player";

export type ExerciseVideoTarget = {
  id: string;
  name: string;
  currentVideo: ExerciseVideo | null;
};

export function ExerciseVideoEditor({
  actor,
  exercise,
}: {
  actor: WorkoutActor;
  exercise: ExerciseVideoTarget;
}) {
  const [expanded, setExpanded] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(exercise.currentVideo);
  const [url, setUrl] = useState(currentVideo?.canonicalSourceUrl ?? "");
  const [creatorName, setCreatorName] = useState(
    currentVideo?.creatorName ?? "",
  );
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);
  const preview = usePreviewExerciseVideo(actor);
  const save = useSaveExerciseVideo(actor);
  const remove = useRemoveExerciseVideo(actor);

  useEffect(() => {
    if (!preview.data || playerReady || playerFailed) return;
    const timer = setTimeout(() => setPlayerFailed(true), 10_000);
    return () => clearTimeout(timer);
  }, [playerFailed, playerReady, preview.data]);

  const runPreview = () => {
    setPlayerReady(false);
    setPlayerFailed(false);
    preview.mutate(url);
  };

  if (!expanded) {
    return (
      <WorkoutButton
        label={
          currentVideo
            ? "Change demonstration video"
            : "Add demonstration video"
        }
        variant="secondary"
        onPress={() => setExpanded(true)}
      />
    );
  }

  return (
    <View className="gap-md rounded-card border border-border bg-background p-md">
      <View className="gap-xs">
        <Text className="font-sans text-label font-bold text-foreground">
          Demonstration video
        </Text>
        <Text className="font-sans text-caption text-muted">
          Add one individual YouTube or Vimeo video. This selection stays
          private to your Coach account.
        </Text>
      </View>
      <WorkoutField
        label="Video link"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        maxLength={500}
        placeholder="https://www.youtube.com/watch?v=..."
      />
      <WorkoutField
        label="Creator name"
        value={creatorName}
        onChangeText={setCreatorName}
        maxLength={100}
        placeholder="Creator or channel"
      />
      <WorkoutButton
        label={preview.isPending ? "Checking video" : "Preview video"}
        variant="secondary"
        disabled={!url.trim() || preview.isPending}
        onPress={runPreview}
      />
      {preview.isError ? (
        <WorkoutMessage
          tone="error"
          title="Video unavailable"
          message={
            preview.error instanceof Error
              ? preview.error.message
              : "Use an individual YouTube or Vimeo video link."
          }
        />
      ) : null}
      {preview.data && !playerFailed ? (
        <ExerciseVideoPlayer
          embedUrl={preview.data.embedUrl}
          title={`${exercise.name} video preview`}
          onReady={() => setPlayerReady(true)}
          onError={() => setPlayerFailed(true)}
        />
      ) : null}
      {playerFailed ? (
        <WorkoutMessage
          tone="error"
          title="Preview did not become ready"
          message="Try another video. Your current saved video was not changed."
        />
      ) : null}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: rightsConfirmed }}
        onPress={() => setRightsConfirmed((value) => !value)}
        className="min-h-12 flex-row items-center gap-md"
      >
        <View
          className={
            rightsConfirmed
              ? "size-6 items-center justify-center rounded-small bg-accent"
              : "size-6 rounded-small border border-border bg-surface"
          }
        >
          {rightsConfirmed ? <Text className="text-surface">✓</Text> : null}
        </View>
        <Text className="flex-1 font-sans text-caption text-foreground">
          I confirm this video may be shared with my Athletes.
        </Text>
      </Pressable>
      {save.isError ? (
        <WorkoutMessage
          tone="error"
          title="Video not saved"
          message={
            save.error instanceof Error ? save.error.message : "Try again."
          }
        />
      ) : null}
      {save.isSuccess ? (
        <WorkoutMessage
          title="Video saved"
          message="Future assignments will use this demonstration."
        />
      ) : null}
      <WorkoutButton
        label={save.isPending ? "Saving video" : "Save video"}
        disabled={
          !playerReady ||
          playerFailed ||
          !creatorName.trim() ||
          !rightsConfirmed ||
          save.isPending
        }
        onPress={() =>
          save.mutate(
            {
              referenceExerciseId: exercise.id,
              url,
              creatorName,
            },
            { onSuccess: (video) => setCurrentVideo(video) },
          )
        }
      />
      {currentVideo ? (
        <WorkoutButton
          label={remove.isPending ? "Removing video" : "Remove saved video"}
          variant="ghost"
          disabled={remove.isPending}
          onPress={() =>
            remove.mutate(exercise.id, {
              onSuccess: () => {
                setCurrentVideo(null);
                setUrl("");
                setCreatorName("");
                setRightsConfirmed(false);
              },
            })
          }
        />
      ) : null}
      <WorkoutButton
        label="Close"
        variant="ghost"
        onPress={() => setExpanded(false)}
      />
    </View>
  );
}
