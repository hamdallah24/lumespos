import { useState, useEffect, useCallback, useRef } from "react";

export interface WidgetState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function useWidgetProvider<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): WidgetState<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<WidgetState<T>>({
    loading: true,
    error: null,
    data: null,
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      setState({ loading: false, error: null, data });
    } catch (err) {
      setState({ loading: false, error: String(err), data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
