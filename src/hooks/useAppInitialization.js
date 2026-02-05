import { useTheme } from "./useTheme";

export function useAppInitialization() {
  const theme = useTheme();

  return { theme };
}
