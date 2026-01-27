import { useState } from "react";

export function useVersionFilters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [appSearchTerm, setAppSearchTerm] = useState("");
  const [showOnlyDownloadableVersions, setShowOnlyDownloadableVersions] = useState(false);
  const [showLTSOnly, setShowLTSOnly] = useState(false);
  const [showMTSOnly, setShowMTSOnly] = useState(false);
  const [showBetaOnly, setShowBetaOnly] = useState(false);

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
