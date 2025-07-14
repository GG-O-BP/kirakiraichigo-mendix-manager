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

fn create_config_with_methods(
    npm_method: Option<String>,
    yarn_method: Option<String>,
    pnpm_method: Option<String>,
) -> PackageManagerConfig {
    PackageManagerConfig {
        npm_method,
        yarn_method,
        pnpm_method,
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

// Pure validation functions
fn is_valid_package_manager(package_manager: &str) -> bool {
    matches!(package_manager, "npm" | "yarn" | "pnpm")
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

// Pure utility functions for external use
pub fn validate_package_manager_name(name: &str) -> Result<(), String> {
    if is_valid_package_manager(name) {
        Ok(())
    } else {
        Err(format!("Invalid package manager: {}", name))
    }
}

pub fn validate_method_value(method: &str) -> Result<(), String> {
    if is_empty_method(method) {
        Err("Method value cannot be empty".to_string())
    } else {
        Ok(())
    }
}

// Pure configuration builders for complex scenarios
pub fn build_config_from_pairs(pairs: Vec<(&str, String)>) -> Result<PackageManagerConfig, String> {
    pairs
        .into_iter()
        .try_fold(create_empty_config(), |config, (manager, method)| {
            validate_package_manager_name(manager)?;
            validate_method_value(&method)?;
            Ok(update_method_for_package_manager(config, manager, method))
        })
}

pub fn merge_configs(
    base: PackageManagerConfig,
    override_config: PackageManagerConfig,
) -> PackageManagerConfig {
    PackageManagerConfig {
        npm_method: override_config.npm_method.or(base.npm_method),
        yarn_method: override_config.yarn_method.or(base.yarn_method),
        pnpm_method: override_config.pnpm_method.or(base.pnpm_method),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_empty_config() {
        let config = create_empty_config();
        assert!(config.npm_method.is_none());
        assert!(config.yarn_method.is_none());
        assert!(config.pnpm_method.is_none());
    }

    #[test]
    fn test_set_methods() {
        let config = create_empty_config();
        let config = set_npm_method(config, "npm install".to_string());
        let config = set_yarn_method(config, "yarn add".to_string());

        assert_eq!(config.npm_method, Some("npm install".to_string()));
        assert_eq!(config.yarn_method, Some("yarn add".to_string()));
        assert!(config.pnpm_method.is_none());
    }

    #[test]
    fn test_get_method_from_config() {
        let config = create_config_with_methods(
            Some("npm install".to_string()),
            Some("yarn add".to_string()),
            None,
        );

        assert_eq!(
            get_method_from_config(&config, "npm"),
            Some(&"npm install".to_string())
        );
        assert_eq!(
            get_method_from_config(&config, "yarn"),
            Some(&"yarn add".to_string())
        );
        assert_eq!(get_method_from_config(&config, "pnpm"), None);
        assert_eq!(get_method_from_config(&config, "invalid"), None);
    }

    #[test]
    fn test_is_valid_package_manager() {
        assert!(is_valid_package_manager("npm"));
        assert!(is_valid_package_manager("yarn"));
        assert!(is_valid_package_manager("pnpm"));
        assert!(!is_valid_package_manager("invalid"));
    }

    #[test]
    fn test_is_empty_method() {
        assert!(is_empty_method(""));
        assert!(is_empty_method("   "));
        assert!(!is_empty_method("npm install"));
    }

    #[test]
    fn test_update_method_for_package_manager() {
        let config = create_empty_config();
        let config = update_method_for_package_manager(config, "npm", "npm install".to_string());

        assert_eq!(config.npm_method, Some("npm install".to_string()));
        assert!(config.yarn_method.is_none());
    }

    #[test]
    fn test_build_config_from_pairs() {
        let pairs = vec![
            ("npm", "npm install".to_string()),
            ("yarn", "yarn add".to_string()),
        ];

        let config = build_config_from_pairs(pairs).unwrap();
        assert_eq!(config.npm_method, Some("npm install".to_string()));
        assert_eq!(config.yarn_method, Some("yarn add".to_string()));
        assert!(config.pnpm_method.is_none());
    }

    #[test]
    fn test_merge_configs() {
        let base = create_config_with_methods(
            Some("npm install".to_string()),
            Some("yarn add".to_string()),
            None,
        );

        let override_config = create_config_with_methods(
            Some("npm ci".to_string()),
            None,
            Some("pnpm install".to_string()),
        );

        let merged = merge_configs(base, override_config);

        assert_eq!(merged.npm_method, Some("npm ci".to_string())); // overridden
        assert_eq!(merged.yarn_method, Some("yarn add".to_string())); // from base
        assert_eq!(merged.pnpm_method, Some("pnpm install".to_string())); // from override
    }

    #[test]
    fn test_functional_builder_methods() {
        let config = PackageManagerConfig::new()
            .with_npm_method("npm install".to_string())
            .with_yarn_method("yarn add".to_string());

        assert_eq!(config.npm_method, Some("npm install".to_string()));
        assert_eq!(config.yarn_method, Some("yarn add".to_string()));
        assert!(config.pnpm_method.is_none());
    }

    #[test]
    fn test_validation_functions() {
        assert!(validate_package_manager_name("npm").is_ok());
        assert!(validate_package_manager_name("invalid").is_err());

        assert!(validate_method_value("npm install").is_ok());
        assert!(validate_method_value("").is_err());
        assert!(validate_method_value("   ").is_err());
    }
}
