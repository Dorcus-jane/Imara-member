import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Loads data whenever the screen comes into view, so lists are fresh after an edit elsewhere.
export function useLoad<T>(loader: () => Promise<T>, deps: React.DependencyList, initial: T): T {
  const [data, setData] = useState<T>(initial);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loader().then((value) => {
        if (active) setData(value);
      });
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps),
  );
  return data;
}
