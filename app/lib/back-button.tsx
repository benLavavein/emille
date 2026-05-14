import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const BackButtonContext = createContext<{
  backUrl: string | null;
  setBackUrl: (url: string | null) => void;
}>({
  backUrl: null,
  setBackUrl: () => {},
});

export function BackButtonProvider({ children }: { children: ReactNode }) {
  const [backUrl, setBackUrlState] = useState<string | null>(null);

  const setBackUrl = useCallback((url: string | null) => {
    setBackUrlState(url);
  }, []);

  return (
    <BackButtonContext.Provider value={{ backUrl, setBackUrl }}>
      {children}
    </BackButtonContext.Provider>
  );
}

export function useBackButton() {
  return useContext(BackButtonContext);
}

/**
 * Call at the top of any page component to show a back button pointing to `url`.
 * Clears automatically on unmount.
 */
export function useSetBackUrl(url: string) {
  const { setBackUrl } = useBackButton();
  useEffect(() => {
    setBackUrl(url);
    return () => setBackUrl(null);
  }, [url, setBackUrl]);
}
