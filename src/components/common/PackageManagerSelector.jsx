import * as R from "ramda";
import { memo } from "react";
import { PACKAGE_MANAGERS } from "../../utils";

const PackageManagerOption = memo(({ pm, packageManager, setPackageManager }) => (
  <label key={pm} className="checkbox-label">
    <input
      type="radio"
      name="packageManager"
      value={pm}
      checked={R.equals(packageManager, pm)}
      onChange={R.pipe(R.path(["target", "value"]), setPackageManager)}
      className="checkbox-input"
    />
    <span className="checkbox-text">{pm}</span>
  </label>
));

PackageManagerOption.displayName = "PackageManagerOption";

const PackageManagerSelector = memo(({ packageManager, setPackageManager }) => (
  <div className="package-manager-group">
    <label className="package-manager-label">Package Manager:</label>
    <div className="package-manager-filters">
      {R.map(
        (pm) => (
          <PackageManagerOption
            key={pm}
            pm={pm}
            packageManager={packageManager}
            setPackageManager={setPackageManager}
          />
        ),
        PACKAGE_MANAGERS,
      )}
    </div>
  </div>
));

PackageManagerSelector.displayName = "PackageManagerSelector";

export default PackageManagerSelector;
