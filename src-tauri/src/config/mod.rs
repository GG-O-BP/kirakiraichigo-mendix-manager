use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PackageManagerConfig {
    pub npm_method: Option<String>,
    pub yarn_method: Option<String>,
    pub pnpm_method: Option<String>,
}

fn construct_config_file_path() -> Result<PathBuf, String> {
    dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())
        .map(|dir| dir.join("kirakiraichigo-mendix-manager").join("package_manager_config.json"))
}

impl PackageManagerConfig {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_method(&self, package_manager: &str) -> Option<&String> {
        match package_manager {
            "npm" => self.npm_method.as_ref(),
            "yarn" => self.yarn_method.as_ref(),
            "pnpm" => self.pnpm_method.as_ref(),
            _ => None,
        }
    }

    pub fn with_method(self, package_manager: &str, method: String) -> Self {
        match package_manager {
            "npm" => self.with_npm_method(method),
            "yarn" => self.with_yarn_method(method),
            "pnpm" => self.with_pnpm_method(method),
            _ => self,
        }
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = construct_config_file_path()
            .map_err(|e| -> Box<dyn std::error::Error> { Box::new(std::io::Error::other(e)) })?;

        if config_path.exists() {
            let content = fs::read_to_string(&config_path)
                .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;

            serde_json::from_str(&content)
                .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })
        } else {
            Ok(Self::default())
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_path = construct_config_file_path()
            .map_err(|e| -> Box<dyn std::error::Error> { Box::new(std::io::Error::other(e)) })?;

        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(self)?;
        fs::write(&config_path, content)?;

        Ok(())
    }

    pub fn with_npm_method(self, method: String) -> Self {
        PackageManagerConfig {
            npm_method: Some(method),
            ..self
        }
    }

    pub fn with_yarn_method(self, method: String) -> Self {
        PackageManagerConfig {
            yarn_method: Some(method),
            ..self
        }
    }

    pub fn with_pnpm_method(self, method: String) -> Self {
        PackageManagerConfig {
            pnpm_method: Some(method),
            ..self
        }
    }

    pub fn has_method(&self, package_manager: &str) -> bool {
        self.get_method(package_manager).is_some()
    }

    pub fn is_method_configured(&self, package_manager: &str) -> bool {
        self.get_method(package_manager)
            .map(|method| !method.trim().is_empty())
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
