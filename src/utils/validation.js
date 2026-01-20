import { invoke } from "@tauri-apps/api/core";

export const invokeValidateBuildDeploySelections = async (selectedWidgets, selectedApps) => {
  const result = await invoke("validate_build_deploy_selections", {
    selectedWidgetCount: selectedWidgets.size,
    selectedAppCount: selectedApps.size,
  });
  return result.is_valid ? null : result.error_message;
};
