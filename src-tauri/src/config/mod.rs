use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// Pure data types - immutable by design
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageManagerConfig {
    pub npm_method: Option<String>,
    pub yarn_method: Option<String>,
    pub pnpm_method: Option<String>,
}

// Pure constructor functions
fn create_empty_config() -> PackageManagerConfig {
    PackageManagerConfig {
        npm_method: None,
        yarn_method: None,
        pnpm_method: None,
    }
}

// Pure query functions
fn get_method_from_config<'a>(
    config: &'a PackageManagerConfig,
    package_manager: &str,
) -> Option<&'a String> {
    match package_manager {
        "npm" => config.npm_method.as_ref(),
        "yarn" => config.yarn_method.as_ref(),
        "pnpm" => config.pnpm_method.as_ref(),
        _ => None,
    }
}

// Pure transformation functions
fn set_npm_method(config: PackageManagerConfig, method: String) -> PackageManagerConfig {
    PackageManagerConfig {
        npm_method: Some(method),
        ..config
    }
}

fn set_yarn_method(config: PackageManagerConfig, method: String) -> PackageManagerConfig {
    PackageManagerConfig {
        yarn_method: Some(method),
        ..config
    }
}

fn set_pnpm_method(config: PackageManagerConfig, method: String) -> PackageManagerConfig {
    PackageManagerConfig {
        pnpm_method: Some(method),
        ..config
    }
}

fn update_method_for_package_manager(
    config: PackageManagerConfig,
    package_manager: &str,
    method: String,
) -> PackageManagerConfig {
    match package_manager {
        "npm" => set_npm_method(config, method),
        "yarn" => set_yarn_method(config, method),
        "pnpm" => set_pnpm_method(config, method),
        _ => config,
    }
}

fn is_empty_method(method: &str) -> bool {
    method.trim().is_empty()
}

// Pure serialization functions
fn serialize_config_to_json(config: &PackageManagerConfig) -> Result<String, String> {
    serde_json::to_string_pretty(config).map_err(|e| format!("Serialization error: {}", e))
}

fn deserialize_config_from_json(content: &str) -> Result<PackageManagerConfig, String> {
    serde_json::from_str(content).map_err(|e| format!("Deserialization error: {}", e))
}

// Pure path construction functions
fn construct_config_directory_path() -> Result<PathBuf, String> {
    dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())
        .map(|dir| dir.join("kirakiraichigo-mendix-manager"))
}

fn construct_config_file_path() -> Result<PathBuf, String> {
    construct_config_directory_path().map(|dir| dir.join("package_manager_config.json"))
}

// Pure file system operation helpers
fn extract_parent_directory(path: &PathBuf) -> Option<&std::path::Path> {
    path.parent()
}

// IO wrapper functions - only these perform side effects
fn read_config_file(file_path: &PathBuf) -> Result<String, String> {
    fs::read_to_string(file_path).map_err(|e| format!("Failed to read config file: {}", e))
}

fn write_config_file(file_path: &PathBuf, content: &str) -> Result<(), String> {
    fs::write(file_path, content).map_err(|e| format!("Failed to write config file: {}", e))
}

fn create_directory_recursive(dir_path: &std::path::Path) -> Result<(), String> {
    fs::create_dir_all(dir_path).map_err(|e| format!("Failed to create directory: {}", e))
}

fn file_exists(path: &PathBuf) -> bool {
    path.exists()
}

// Main API functions - compose pure functions with minimal IO
impl PackageManagerConfig {
    pub fn new() -> Self {
        create_empty_config()
    }

    pub fn get_method(&self, package_manager: &str) -> Option<&String> {
        get_method_from_config(self, package_manager)
    }

    pub fn with_method(self, package_manager: &str, method: String) -> Self {
        update_method_for_package_manager(self, package_manager, method)
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path =
            construct_config_file_path().map_err(|e| -> Box<dyn std::error::Error> {
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;

        if file_exists(&config_path) {
            let content =
                read_config_file(&config_path).map_err(|e| -> Box<dyn std::error::Error> {
                    Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
                })?;

            deserialize_config_from_json(&content).map_err(|e| -> Box<dyn std::error::Error> {
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
            })
        } else {
            Ok(create_empty_config())
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_path =
            construct_config_file_path().map_err(|e| -> Box<dyn std::error::Error> {
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;

        // Ensure parent directory exists
        if let Some(parent) = extract_parent_directory(&config_path) {
            create_directory_recursive(parent).map_err(|e| -> Box<dyn std::error::Error> {
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;
        }

        let content =
            serialize_config_to_json(self).map_err(|e| -> Box<dyn std::error::Error> {
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;

        write_config_file(&config_path, &content).map_err(|e| -> Box<dyn std::error::Error> {
            Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
        })
    }

    // Additional functional methods for composition
    pub fn with_npm_method(self, method: String) -> Self {
        set_npm_method(self, method)
    }

    pub fn with_yarn_method(self, method: String) -> Self {
        set_yarn_method(self, method)
    }

    pub fn with_pnpm_method(self, method: String) -> Self {
        set_pnpm_method(self, method)
    }

    pub fn has_method(&self, package_manager: &str) -> bool {
        self.get_method(package_manager).is_some()
    }

    pub fn is_method_configured(&self, package_manager: &str) -> bool {
        self.get_method(package_manager)
            .map(|method| !is_empty_method(method))
            .unwrap_or(false)
    }

    pub fn get_configured_managers(&self) -> Vec<&str> {
        ["npm", "yarn", "pnpm"]
            .iter()
            .filter(|&&manager| self.has_method(manager))
            .copied()
            .collect()
    }
}
