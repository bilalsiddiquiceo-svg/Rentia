'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchFavoriteIds, addFavorite, removeFavorite } from './properties';

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchFavoriteIds()
      .then((data) => {
        setIds(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const isFavorited = useCallback((id: string) => ids.includes(id), [ids]);

  const toggleFavorite = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const wasFavorited = ids.includes(id);
    setIds((prev) =>
      wasFavorited ? prev.filter((x) => x !== id) : [...prev, id],
    );
    try {
      if (wasFavorited) {
        await removeFavorite(id);
      } else {
        await addFavorite(id);
      }
      return { success: true };
    } catch (e) {
      setIds((prev) =>
        wasFavorited ? [...prev, id] : prev.filter((x) => x !== id),
      );
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update favorite' };
    }
  }, [ids]);

  const refetchIds = useCallback(async () => {
    try {
      const data = await fetchFavoriteIds();
      setIds(data);
    } catch {
      // ignore
    }
  }, []);

  return { ids, isFavorited, toggleFavorite, loaded, refetchIds };
}
