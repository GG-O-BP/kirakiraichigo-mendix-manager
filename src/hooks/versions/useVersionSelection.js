import { useAtomValue, useSetAtom } from "jotai";
import {
  selectedVersionAtom,
  toggleVersionSelectionAtom,
} from "../../atoms";

export function useVersionSelection() {
  const selectedVersion = useAtomValue(selectedVersionAtom);
  const toggleSelection = useSetAtom(toggleVersionSelectionAtom);

  return {
    selectedVersion,
    handleVersionClick: toggleSelection,
  };
}
