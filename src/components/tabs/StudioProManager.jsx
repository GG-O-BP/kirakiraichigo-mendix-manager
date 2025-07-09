import { useMemo } from "react";
import SearchBox from "../common/SearchBox";
import ListItem from "../common/ListItem";
import { ListArea, MendixVersionListItem, MendixAppListItem, createSearchFilter } from "../common/ListItems";

const StudioProManager = ({
  searchTerm,
  setSearchTerm,
  versions,
  filteredVersions,
  selectedVersion,
  handleVersionClick,
  apps,
  listData,
  isLoading,
  handleLaunchStudioPro,
  handleUninstallClick,
  handleItemClick,
}) => {
  const sortedAndFilteredMendixApps = useMemo(() => {
    let filtered = apps.filter((app) =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (selectedVersion) {
      // Sort apps: matching version first, then by last modified
      filtered.sort((a, b) => {
        const aMatches = a.version === selectedVersion;
        const bMatches = b.version === selectedVersion;

        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;

        // If both match or both don't match, sort by last modified
        if (a.last_modified && b.last_modified) {
          return new Date(b.last_modified) - new Date(a.last_modified);
        }
        return 0;
      });
    } else {
      // Default sort by last modified
      filtered.sort((a, b) => {
        if (a.last_modified && b.last_modified) {
          return new Date(b.last_modified) - new Date(a.last_modified);
        }
        return 0;
      });
    }

    return filtered;
  }, [apps, searchTerm, selectedVersion]);

  return (
    <div className="studio-pro-manager">
      <div className="list-container">
        <SearchBox
          placeholder="Search items..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <div className="list-area">
          {listData.filter(createSearchFilter(searchTerm)).map((item) => (
            <ListItem key={item.id} item={item} onClick={handleItemClick} />
          ))}
        </div>
      </div>
      <div className="list-container">
        <SearchBox
          placeholder="Search installed versions..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <div className="list-area">
          {filteredVersions.map((version) => (
            <MendixVersionListItem
              key={version.version}
              version={version}
              onLaunch={handleLaunchStudioPro}
              onUninstall={handleUninstallClick}
              isLaunching={isLoading}
              isUninstalling={isLoading}
              isSelected={selectedVersion === version.version}
              onClick={() => handleVersionClick(version)}
            />
          ))}
          {versions.length === 0 && (
            <div className="loading-indicator">
              <span className="loading-icon">🍓</span>
              <span>No Mendix Studio Pro versions found</span>
            </div>
          )}
        </div>
      </div>
      <div className="list-container narrow">
        <SearchBox
          placeholder="Search Mendix apps..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <div className="list-area">
          {sortedAndFilteredMendixApps.map((app) => (
            <MendixAppListItem
              key={app.name}
              app={app}
              isDisabled={selectedVersion && app.version !== selectedVersion}
              onClick={() => handleItemClick(app)}
            />
          ))}
          {apps.length === 0 && (
            <div className="loading-indicator">
              <span className="loading-icon">🍓</span>
              <span>No Mendix apps found</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioProManager;
