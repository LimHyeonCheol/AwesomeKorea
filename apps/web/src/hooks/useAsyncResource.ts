import {
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";

interface UseAsyncResourceOptions<T> {
  enabled?: boolean;
  initialData?: T | null;
}

interface AsyncResourceState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
};

export function useAsyncResource<T>(
  loader: () => Promise<T>,
  dependencies: DependencyList,
  options: UseAsyncResourceOptions<T> = {},
) {
  const { enabled = true, initialData = null } = options;
  const requestIdRef = useRef(0);
  const [state, setState] = useState<AsyncResourceState<T>>({
    data: initialData,
    error: null,
    isLoading: enabled,
  });

  const run = async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
    }));

    try {
      const data = await loader();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setState({
        data,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setState((current) => ({
        ...current,
        error: getErrorMessage(error),
        isLoading: false,
      }));
    }
  };

  useEffect(() => {
    if (!enabled) {
      setState((current) => ({
        ...current,
        isLoading: false,
      }));
      return;
    }

    void run();
  }, [enabled, ...dependencies]);

  return {
    ...state,
    refetch: run,
  };
}
