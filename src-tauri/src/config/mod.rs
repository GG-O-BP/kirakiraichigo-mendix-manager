use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageManagerConfig {
    pub npm_method: Option<String>,
    pub yarn_method: Option<String>,
    pub pnpm_method: Option<String>,
}

impl PackageManagerConfig {
    pub fn new() -> Self {
        Self {
            npm_method: None,
            yarn_method: None,
            pnpm_method: None,
        }
    }

    pub fn get_method(&self, package_manager: &str) -> Option<&String> {
        match package_manager {
            "npm" => self.npm_method.as_ref(),
            "yarn" => self.yarn_method.as_ref(),
            "pnpm" => self.pnpm_method.as_ref(),
            _ => None,
        }
    }

    pub fn set_method(&mut self, package_manager: &str, method: String) {
        match package_manager {
            "npm" => self.npm_method = Some(method),
            "yarn" => self.yarn_method = Some(method),
            "pnpm" => self.pnpm_method = Some(method),
            _ => {}
        }
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = Self::get_config_path()?;
        if config_path.exists() {
            let content = fs::read_to_string(&config_path)?;
            let config: PackageManagerConfig = serde_json::from_str(&content)?;
            Ok(config)
        } else {
            Ok(Self::new())
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_path = Self::get_config_path()?;
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(&self)?;
        fs::write(&config_path, content)?;
        Ok(())
    }

    fn get_config_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let config_dir = dirs::config_dir()
            .ok_or("Could not find config directory")?
            .join("kirakiraichigo-mendix-manager");
        Ok(config_dir.join("package_manager_config.json"))
    }
}
