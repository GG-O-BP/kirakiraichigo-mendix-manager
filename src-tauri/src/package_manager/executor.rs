use crate::config::PackageManagerConfig;
use crate::package_manager::strategies::all_strategies;
use crate::package_manager::strategy::ExecutionStrategy;
use std::path::Path;

/// StrategyExecutor manages the execution of package manager commands
/// using a fallback strategy pattern.
///
/// It attempts to use a saved successful method first, then falls back
/// to trying all available strategies in order until one succeeds.
pub struct StrategyExecutor {
    strategies: Vec<Box<dyn ExecutionStrategy>>,
}

impl Default for StrategyExecutor {
    fn default() -> Self {
        Self::new()
    }
}

impl StrategyExecutor {
    /// Creates a new executor with all available strategies
    pub fn new() -> Self {
        Self {
            strategies: all_strategies(),
        }
    }

    /// Validates that the working directory exists and is a directory
    fn validate_working_directory(working_directory: &str) -> Result<(), String> {
        let work_dir = Path::new(working_directory);
        if !work_dir.exists() {
            return Err(format!(
                "Working directory does not exist: {}",
                working_directory
            ));
        }
        if !work_dir.is_dir() {
            return Err(format!(
                "Working directory is not a directory: {}",
                working_directory
            ));
        }
        Ok(())
    }

    /// Finds a strategy by name
    fn find_strategy_by_name(&self, name: &str) -> Option<&dyn ExecutionStrategy> {
        self.strategies
            .iter()
            .find(|s| s.name() == name)
            .map(|s| s.as_ref())
    }

    /// Attempts to execute using the saved method for this package manager
    fn try_saved_method(
        &self,
        config: &PackageManagerConfig,
        package_manager: &str,
        command: &str,
        working_directory: &str,
    ) -> Option<Result<String, String>> {
        let saved_method = config.get_method(package_manager)?;
        println!("[Package Manager] Trying saved method: {}", saved_method);

        let strategy = self.find_strategy_by_name(saved_method)?;
        let result = strategy.execute(package_manager, command, working_directory);

        if result.is_ok() {
            println!("[Package Manager] Saved method succeeded");
        } else {
            println!("[Package Manager] Saved method failed, trying other methods");
        }

        Some(result)
    }

    /// Executes a package manager command using fallback strategies
    ///
    /// # Arguments
    /// * `package_manager` - The package manager to use (npm, yarn, pnpm, bun)
    /// * `command` - The command to execute (e.g., "install", "run build")
    /// * `working_directory` - The directory to run the command in
    ///
    /// # Returns
    /// * `Ok(String)` - Command output on success
    /// * `Err(String)` - Comprehensive error message with troubleshooting tips
    pub fn execute(
        &self,
        package_manager: &str,
        command: &str,
        working_directory: &str,
    ) -> Result<String, String> {
        let mut config =
            PackageManagerConfig::load().unwrap_or_else(|_| PackageManagerConfig::new());

        println!(
            "[Package Manager] Executing {} {} in {}",
            package_manager, command, working_directory
        );

        Self::validate_working_directory(working_directory)?;
        println!("[Package Manager] Working directory validated");

        // Try saved method first if available
        if let Some(result) =
            self.try_saved_method(&config, package_manager, command, working_directory)
        {
            if result.is_ok() {
                return result;
            }
        }

        // Try all strategies in order
        let mut last_error = String::new();

        for (index, strategy) in self.strategies.iter().enumerate() {
            let method_number = index + 1;

            match strategy.execute(package_manager, command, working_directory) {
                Ok(output) => {
                    // Save successful method for future use
                    config = config.with_method(package_manager, strategy.name().to_string());
                    let _ = config.save();
                    return Ok(output);
                }
                Err(err) => {
                    println!(
                        "[Package Manager] Method {} ({}) failed: {}",
                        method_number,
                        strategy.name(),
                        err
                    );
                    last_error = err;
                }
            }
        }

        // All strategies failed
        Err(format!(
            "Failed to execute '{}' command after trying all methods.\n\
            Last error: {}\n\
            \n\
            Troubleshooting:\n\
            1. Make sure {} is installed and in your PATH\n\
            2. If using fnm, ensure it's properly configured\n\
            3. Try running 'where {}' in PowerShell to verify installation\n\
            4. Restart your computer if you recently installed the package manager",
            package_manager, last_error, package_manager, package_manager
        ))
    }
}

use std::sync::OnceLock;

/// Global executor instance for convenience
static EXECUTOR: OnceLock<StrategyExecutor> = OnceLock::new();

fn executor() -> &'static StrategyExecutor {
    EXECUTOR.get_or_init(StrategyExecutor::new)
}

/// Executes a package manager command using the global executor
pub fn execute_package_manager_command(
    package_manager: &str,
    command: &str,
    working_directory: &str,
) -> Result<String, String> {
    executor().execute(package_manager, command, working_directory)
}
