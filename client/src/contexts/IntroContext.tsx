import { createContext, useContext } from "react";

interface IntroContextValue {
  replayIntro: () => void;
}

export const IntroContext = createContext<IntroContextValue>({
  replayIntro: () => {},
});

export function useIntro() {
  return useContext(IntroContext);
}
