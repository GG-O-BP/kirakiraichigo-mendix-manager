use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PackageManagerConfig {
    pub npm_method: Option<String>,
    pub yarn_method: Option<String>,
    pub pnpm_method: Option<String>,
}

static CONFIG_MUTEX: OnceLock<Mutex<()>> = OnceLock::new();

fn config_mutex() -> &'static Mutex<()> {
    CONFIG_MUTEX.get_or_init(|| Mutex::new(()))
}

fn boxed<E: Into<Box<dyn std::error::Error>>>(err: E) -> Box<dyn std::error::Error> {
    err.into()
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

    fn load_inner() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path =
            construct_config_file_path().map_err(|e| boxed(std::io::Error::other(e)))?;

        if config_path.exists() {
            let content = fs::read_to_string(&config_path)?;
            Ok(serde_json::from_str(&content)?)
        } else {
            Ok(Self::default())
        }
    }

    fn save_inner(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_path =
            construct_config_file_path().map_err(|e| boxed(std::io::Error::other(e)))?;

        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(self)?;
        let tmp_path = config_path.with_extension("json.tmp");
        fs::write(&tmp_path, content)?;
        fs::rename(&tmp_path, &config_path)?;

        Ok(())
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let _lock = config_mutex().lock().map_err(|e| boxed(e.to_string()))?;
        Self::load_inner()
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let _lock = config_mutex().lock().map_err(|e| boxed(e.to_string()))?;
        self.save_inner()
    }

    /// Atomically loads the latest config, applies the successful method for
    /// `package_manager`, and saves it back — all while holding the config lock.
    ///
    /// This prevents lost updates when multiple installs run in parallel and
    /// each records its own successful strategy.
    pub fn update_method(
        package_manager: &str,
        method: String,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let _lock = config_mutex().lock().map_err(|e| boxed(e.to_string()))?;
        let updated = Self::load_inner()
            .unwrap_or_default()
            .with_method(package_manager, method);
        updated.save_inner()
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
