/// ExecutionStrategy trait defines the interface for package manager execution strategies.
///
/// Each strategy represents a different method of running package manager commands
/// on Windows systems, accounting for various Node.js installation methods (fnm, direct, etc.)
pub trait ExecutionStrategy: Send + Sync {
    /// Returns the unique identifier for this strategy
    fn name(&self) -> &'static str;

    /// Attempts to execute the package manager command using this strategy
    ///
    /// # Arguments
    /// * `package_manager` - The package manager to use (npm, yarn, pnpm, bun)
    /// * `command` - The command to execute (e.g., "install", "run build")
    /// * `working_directory` - The directory to run the command in
    ///
    /// # Returns
    /// * `Ok(String)` - Command output on success
    /// * `Err(String)` - Error message on failure
    fn execute(
        &self,
        package_manager: &str,
        command: &str,
        working_directory: &str,
    ) -> Result<String, String>;
}
