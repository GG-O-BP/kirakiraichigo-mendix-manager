mod execution;
mod models;
mod paths;
mod scanner;

// Re-export models
pub use models::{MendixApp, MendixVersion};

// Re-export Tauri commands
pub use execution::{
    delete_mendix_app, get_apps_by_version, get_installed_mendix_apps,
    get_installed_mendix_versions, launch_studio_pro, uninstall_studio_pro_and_wait,
};
