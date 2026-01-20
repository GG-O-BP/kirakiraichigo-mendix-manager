use crate::package_manager::strategy::ExecutionStrategy;
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Strategy 5: Direct Rust Command execution
///
/// Executes the package manager directly using Rust's Command API.
/// This is the most basic fallback that relies on the system PATH.
pub struct DirectCommandStrategy;

impl ExecutionStrategy for DirectCommandStrategy {
    fn name(&self) -> &'static str {
        "direct_command"
    }

    fn execute(
        &self,
        package_manager: &str,
        command: &str,
        working_directory: &str,
    ) -> Result<String, String> {
        println!("[Package Manager] Trying direct command execution");

        let mut cmd = Command::new(package_manager);
        cmd.args(command.split_whitespace());
        cmd.current_dir(working_directory);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        match cmd.output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);

                if output.status.success() {
                    Ok(stdout.to_string())
                } else {
                    Err(format!(
                        "Direct command failed with status: {:?}\nOutput: {}\nError: {}",
                        output.status, stdout, stderr
                    ))
                }
            }
            Err(e) => Err(format!("Failed to execute direct command: {}", e)),
        }
    }
}
