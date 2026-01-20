import { useState } from "react";

/**
 * useVersionFilters - Pure filter state management for versions
 * Manages search term and filter toggles (LTS, MTS, Beta, downloadable-only)
 */
export function useVersionFilters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyDownloadableVersions, setShowOnlyDownloadableVersions] = useState(false);
  const [showLTSOnly, setShowLTSOnly] = useState(false);
  const [showMTSOnly, setShowMTSOnly] = useState(false);
  const [showBetaOnly, setShowBetaOnly] = useState(false);

  return {
    searchTerm,
    setSearchTerm,
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
