use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Executes a PowerShell script and returns the output.
///
/// # Arguments
/// * `script` - The PowerShell script to execute
/// * `method_name` - A name for logging purposes
///
/// # Returns
/// * `Ok(String)` - The stdout output on success
/// * `Err(String)` - Error message with combined stdout/stderr on failure
pub fn execute_powershell_script(script: &str, method_name: &str) -> Result<String, String> {
    println!("[Package Manager] Trying method: {}", method_name);

    let mut ps_cmd = Command::new("powershell");
    ps_cmd.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ]);
    ps_cmd.stdout(Stdio::piped());
    ps_cmd.stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    ps_cmd.creation_flags(CREATE_NO_WINDOW);

    match ps_cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            println!(
                "[Package Manager] {} completed with status: {:?}",
                method_name, output.status
            );

            if !stdout.trim().is_empty() {
                println!("[Package Manager] Output: {}", stdout);
            }

            if !stderr.trim().is_empty() {
                println!("[Package Manager] Error output: {}", stderr);
            }

            if output.status.success() {
                Ok(stdout.to_string())
            } else {
                let exit_code = output.status.code().unwrap_or(-1);
                let combined_output = format!("{}\n{}", stdout, stderr);
                Err(format!(
                    "{} failed with exit code {}\nOutput: {}",
                    method_name,
                    exit_code,
                    combined_output.trim()
                ))
            }
        }
        Err(e) => Err(format!("{} execution error: {}", method_name, e)),
    }
}
