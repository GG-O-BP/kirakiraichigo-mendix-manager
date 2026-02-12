import { useAtom } from "jotai";
import {
  versionSearchTermAtom,
  appSearchTermAtom,
  showOnlyDownloadableVersionsAtom,
  showLTSOnlyAtom,
  showMTSOnlyAtom,
  showBetaOnlyAtom,
} from "../../atoms";

export function useVersionFilters() {
  const [searchTerm, setSearchTerm] = useAtom(versionSearchTermAtom);
  const [appSearchTerm, setAppSearchTerm] = useAtom(appSearchTermAtom);
  const [showOnlyDownloadableVersions, setShowOnlyDownloadableVersions] = useAtom(showOnlyDownloadableVersionsAtom);
  const [showLTSOnly, setShowLTSOnly] = useAtom(showLTSOnlyAtom);
  const [showMTSOnly, setShowMTSOnly] = useAtom(showMTSOnlyAtom);
  const [showBetaOnly, setShowBetaOnly] = useAtom(showBetaOnlyAtom);

  return {
    searchTerm,
    setSearchTerm,
    appSearchTerm,
    setAppSearchTerm,
    showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions,
    showLTSOnly,
    setShowLTSOnly,
    showMTSOnly,
    setShowMTSOnly,
    showBetaOnly,
    setShowBetaOnly,
  };
}
