import { useCallback, useEffect, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
};

export function useAsyncData<T>(loader: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    loader()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const error =
          cause instanceof Error
            ? cause
            : new Error("Unable to load preview data.");
        setState({ data: null, error, loading: false });
      });

    return () => {
      active = false;
    };
  }, [attempt, loader]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, error: null, loading: true }));
    setAttempt((current) => current + 1);
  }, []);

  return { ...state, retry };
}
