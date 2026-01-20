use crate::config::PackageManagerConfig;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetInstallInput {
    pub id: String,
    pub caption: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    pub widget_id: String,
    pub widget_caption: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchInstallSummary {
    pub results: Vec<InstallResult>,
    pub failed_widget_names: Vec<String>,
    pub success_count: usize,
    pub failure_count: usize,
}

#[tauri::command]
pub fn run_package_manager_command(
    package_manager: String,
    command: String,
    working_directory: String,
) -> Result<String, String> {
    let mut config = PackageManagerConfig::load().unwrap_or_else(|_| PackageManagerConfig::new());
    println!(
        "[Package Manager] Executing {} {} in {}",
        package_manager, command, working_directory
    );

    // Validate working directory
    let work_dir = Path::new(&working_directory);
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

    println!("[Package Manager] Working directory validated");

    // Load saved configuration

    // Try saved method first if available
    if let Some(saved_method) = config.get_method(&package_manager) {
        println!("[Package Manager] Trying saved method: {}", saved_method);
        let result = match saved_method.as_str() {
            "direct_node" => {
                run_with_direct_node_search(&package_manager, &command, &working_directory)
            }
            "fnm_simple" => run_with_fnm_simple(&package_manager, &command, &working_directory),
            "powershell_fnm" => {
                run_with_powershell_fnm(&package_manager, &command, &working_directory)
            }
            "powershell_simple" => {
                run_with_powershell_simple(&package_manager, &command, &working_directory)
            }
            "direct_command" => run_direct_command(&package_manager, &command, &working_directory),
            _ => Err("Unknown saved method".to_string()),
        };

        if let Ok(output) = result {
            println!("[Package Manager] Saved method succeeded");
            return Ok(output);
        } else {
            println!("[Package Manager] Saved method failed, trying other methods");
        }
    }

    // Try method 1: Direct Node.js search (bypass fnm)
    match run_with_direct_node_search(&package_manager, &command, &working_directory) {
        Ok(output) => {
            config = config.with_method(&package_manager, "direct_node".to_string());
            let _ = config.save();
            return Ok(output);
        }
        Err(err) => {
            println!("[Package Manager] Method 1 (direct node) failed: {}", err);
        }
    }

    // Try method 2: Simple fnm method
    match run_with_fnm_simple(&package_manager, &command, &working_directory) {
        Ok(output) => {
            config = config.with_method(&package_manager, "fnm_simple".to_string());
            let _ = config.save();
            return Ok(output);
        }
        Err(err) => {
            println!("[Package Manager] Method 2 (fnm simple) failed: {}", err);
        }
    }

    // Try method 3: PowerShell with fnm support
    match run_with_powershell_fnm(&package_manager, &command, &working_directory) {
        Ok(output) => {
            config = config.with_method(&package_manager, "powershell_fnm".to_string());
            let _ = config.save();
            return Ok(output);
        }
        Err(err) => {
            println!("[Package Manager] Method 3 (fnm complex) failed: {}", err);
        }
    }

    // Try method 4: PowerShell without fnm
    match run_with_powershell_simple(&package_manager, &command, &working_directory) {
        Ok(output) => {
            config = config.with_method(&package_manager, "powershell_simple".to_string());
            let _ = config.save();
            return Ok(output);
        }
        Err(err) => {
            println!("[Package Manager] Method 4 (simple) failed: {}", err);
        }
    }

    // Try method 5: Direct command execution
    match run_direct_command(&package_manager, &command, &working_directory) {
        Ok(output) => {
            config = config.with_method(&package_manager, "direct_command".to_string());
            let _ = config.save();
            return Ok(output);
        }
        Err(err) => {
            println!("[Package Manager] Method 5 (direct) failed: {}", err);
            Err(format!(
                "Failed to execute '{}' command after trying all methods.\n\
                Last error: {}\n\
                \n\
                Troubleshooting:\n\
                1. Make sure {} is installed and in your PATH\n\
                2. If using fnm, ensure it's properly configured\n\
                3. Try running 'where {}' in PowerShell to verify installation\n\
                4. Restart your computer if you recently installed the package manager",
                package_manager, err, package_manager, package_manager
            ))
        }
    }
}

fn run_with_direct_node_search(
    package_manager: &str,
    command: &str,
    working_directory: &str,
) -> Result<String, String> {
    println!("[Package Manager] Trying direct Node.js search method");

    let ps_script = format!(
        r#"
        # Change to working directory
        cd '{}'

        # Search for Node.js in common locations
        $nodePaths = @(
            "$env:ProgramFiles\nodejs",
            "$env:ProgramFiles (x86)\nodejs",
            "$env:LOCALAPPDATA\Programs\nodejs",
            "$env:APPDATA\npm",
            "$env:USERPROFILE\scoop\apps\nodejs\current",
            "$env:USERPROFILE\scoop\apps\nodejs\current\bin"
        )

        $foundNode = $false
        foreach ($nodePath in $nodePaths) {{
            if (Test-Path "$nodePath\node.exe") {{
                Write-Host "[Node] Found Node.js at: $nodePath"
                $env:Path = "$nodePath;$env:Path"
                $foundNode = $true
                break
            }}
        }}

        if (-not $foundNode) {{
            # Check if node is already in PATH
            $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
            if ($nodeCmd) {{
                Write-Host "[Node] Node.js already in PATH: $($nodeCmd.Source)"
                $foundNode = $true
            }}
        }}

        if ($foundNode) {{
            Write-Host "[Node] Node version: $(& node --version 2>&1)"

            # Add npm global bin to PATH
            $npmPrefix = & npm config get prefix 2>&1
            if ($npmPrefix -and (Test-Path "$npmPrefix\node_modules")) {{
                $env:Path = "$npmPrefix;$env:Path"
                Write-Host "[npm] Added npm prefix to PATH: $npmPrefix"
            }}
        }}

        # Search for package manager in specific locations
        $pmLocations = @()

        if ('{}' -eq 'pnpm') {{
            $pmLocations = @(
                "$env:LOCALAPPDATA\pnpm\pnpm.exe",
                "$env:LOCALAPPDATA\pnpm\pnpm.cmd",
                "$env:APPDATA\npm\pnpm.cmd",
                "$env:USERPROFILE\.pnpm\pnpm.exe"
            )
        }} elseif ('{}' -eq 'yarn') {{
            $pmLocations = @(
                "$env:APPDATA\npm\yarn.cmd",
                "$env:APPDATA\npm\yarn.ps1",
                "$env:ProgramFiles (x86)\Yarn\bin\yarn.cmd",
                "$env:ProgramFiles\Yarn\bin\yarn.cmd"
            )
        }} elseif ('{}' -eq 'npm') {{
            $pmLocations = @(
                "$env:ProgramFiles\nodejs\npm.cmd",
                "$env:ProgramFiles (x86)\nodejs\npm.cmd"
            )
        }} elseif ('{}' -eq 'bun') {{
            $pmLocations = @(
                "$env:USERPROFILE\.bun\bin\bun.exe"
            )
        }}

        $pmFound = $false
        foreach ($loc in $pmLocations) {{
            if (Test-Path $loc) {{
                Write-Host "[Package Manager] Found {} at: $loc"
                $dir = Split-Path $loc
                if ($env:Path -notlike "*$dir*") {{
                    $env:Path = "$dir;$env:Path"
                }}
                $pmFound = $true
                break
            }}
        }}

        if (-not $pmFound) {{
            $pmCmd = Get-Command {} -ErrorAction SilentlyContinue
            if ($pmCmd) {{
                Write-Host "[Package Manager] {} already in PATH: $($pmCmd.Source)"
                $pmFound = $true
            }}
        }}

        if ($pmFound) {{
            Write-Host "[Package Manager] Executing: {} {}"
            & {} {} 2>&1 | Out-Host
            exit $LASTEXITCODE
        }} else {{
            Write-Error "{} not found after searching common locations"
            exit 1
        }}
        "#,
        working_directory,              // 1. cd '{}'
        package_manager,                // 2. if ('{}' -eq 'pnpm')
        package_manager,                // 3. elseif ('{}' -eq 'yarn')
        package_manager,                // 4. elseif ('{}' -eq 'npm')
        package_manager,                // 5. elseif ('{}' -eq 'bun')
        package_manager,                // 6. Found {} at: $loc
        package_manager,                // 7. Get-Command {}
        package_manager.to_uppercase(), // 8. {} already in PATH
        package_manager,                // 9. Executing: {}
        command,                        // 10. {}
        package_manager,                // 11. & {}
        command,                        // 12. {}
        package_manager.to_uppercase()  // 13. {} not found
    );

    execute_powershell_script(&ps_script, "Direct Node.js search")
}

fn run_with_fnm_simple(
    package_manager: &str,
    command: &str,
    working_directory: &str,
) -> Result<String, String> {
    println!("[Package Manager] Trying simple fnm method");

    let ps_script = format!(
        r#"
        # Change to working directory
        cd '{}'

        # Check if fnm exists
        $fnmCmd = Get-Command fnm -ErrorAction SilentlyContinue
        if ($fnmCmd) {{
            Write-Host "[fnm] Found fnm, initializing environment"

            # Run fnm env and parse output
            $envOutput = & fnm env --shell powershell

            # Execute each environment variable assignment
            $envOutput -split "`n" | ForEach-Object {{
                if ($_ -match '^\$env:(\w+)\s*=\s*"([^"]*)"') {{
                    $varName = $matches[1]
                    $varValue = $matches[2]
                    Write-Host "[fnm] Setting $varName"
                    Set-Item -Path "env:$varName" -Value $varValue
                }}
            }}

            # If .nvmrc exists, use that version
            if (Test-Path .nvmrc) {{
                Write-Host "[fnm] Using Node version from .nvmrc"
                & fnm use
            }}
        }}

        # Now try to run the package manager
        $pmCmd = Get-Command {} -ErrorAction SilentlyContinue
        if (-not $pmCmd) {{
            # If not found, check common locations
            $locations = @(
                "$env:APPDATA\npm\{}.cmd",
                "$env:LOCALAPPDATA\pnpm\{}.cmd"
            )

            foreach ($loc in $locations) {{
                if (Test-Path $loc) {{
                    Write-Host "[Package Manager] Found at: $loc"
                    & $loc {} 2>&1 | Out-Host
                    exit $LASTEXITCODE
                }}
            }}

            Write-Error "{} not found"
            exit 1
        }} else {{
            Write-Host "[Package Manager] Found at: $($pmCmd.Source)"
            & {} {} 2>&1 | Out-Host
            exit $LASTEXITCODE
        }}
        "#,
        working_directory,
        package_manager,
        package_manager,
        package_manager,
        command,
        package_manager.to_uppercase(),
        package_manager,
        command
    );

    execute_powershell_script(&ps_script, "Simple fnm")
}

fn run_with_powershell_fnm(
    package_manager: &str,
    command: &str,
    working_directory: &str,
) -> Result<String, String> {
    let ps_script = format!(
        r#"
        # Set error action preference
        $ErrorActionPreference = 'Continue'

        # Change to working directory
        Set-Location -Path '{}'

        # Refresh PATH first to ensure we have the latest system paths
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        # Function to initialize fnm
        function Initialize-Fnm {{
            $fnmPath = $null

            # Check if fnm is already in PATH
            $fnmCmd = Get-Command fnm -ErrorAction SilentlyContinue
            if ($fnmCmd) {{
                $fnmPath = $fnmCmd.Source
                Write-Host "[fnm] Found fnm in PATH: $fnmPath"
            }} else {{
                # Search for fnm in common locations
                $possiblePaths = @(
                    "$env:USERPROFILE\.fnm\fnm.exe",
                    "$env:LOCALAPPDATA\fnm\fnm.exe",
                    "$env:APPDATA\fnm\fnm.exe",
                    "$env:ProgramFiles\fnm\fnm.exe"
                )

                foreach ($path in $possiblePaths) {{
                    if (Test-Path $path) {{
                        $fnmPath = $path
                        Write-Host "[fnm] Found fnm at: $fnmPath"
                        break
                    }}
                }}
            }}

            if ($fnmPath) {{
                try {{
                    Write-Host "[fnm] Current PATH before init: $env:Path"

                    # Initialize fnm environment
                    Write-Host "[fnm] Running: $fnmPath env --use-on-cd --shell powershell"
                    $fnmEnv = & $fnmPath env --use-on-cd --shell powershell 2>&1
                    Write-Host "[fnm] Env output: $fnmEnv"

                    if ($fnmEnv) {{
                        # Execute each line separately to ensure proper environment setup
                        $fnmEnv -split "`n" | ForEach-Object {{
                            if ($_ -match '^\$env:') {{
                                Write-Host "[fnm] Executing: $_"
                                Invoke-Expression $_
                            }}
                        }}
                        Write-Host "[fnm] Environment initialized"
                    }}

                    # Use node version from .nvmrc or .node-version if exists
                    if ((Test-Path .nvmrc) -or (Test-Path .node-version)) {{
                        Write-Host "[fnm] Found node version file, using specified version"
                        $useOutput = & $fnmPath use --install-if-missing 2>&1
                        Write-Host "[fnm] Use output: $useOutput"

                        # Re-run env to get updated paths after version switch
                        $fnmEnv2 = & $fnmPath env --use-on-cd --shell powershell 2>&1
                        $fnmEnv2 -split "`n" | ForEach-Object {{
                            if ($_ -match '^\$env:') {{
                                Invoke-Expression $_
                            }}
                        }}
                    }}

                    # Check for fnm node installations and add to PATH
                    $fnmNodePath = "$env:USERPROFILE\.fnm\node-versions"
                    if (Test-Path $fnmNodePath) {{
                        Write-Host "[fnm] Found fnm node versions at: $fnmNodePath"

                        # Get the current node version path from FNM_MULTISHELL_PATH
                        if ($env:FNM_MULTISHELL_PATH) {{
                            Write-Host "[fnm] FNM_MULTISHELL_PATH: $env:FNM_MULTISHELL_PATH"
                            if ($env:Path -notlike "*$env:FNM_MULTISHELL_PATH*") {{
                                $env:Path = "$env:FNM_MULTISHELL_PATH;$env:Path"
                                Write-Host "[fnm] Added FNM_MULTISHELL_PATH to PATH"
                            }}
                        }}
                    }}

                    Write-Host "[fnm] PATH after init: $env:Path"

                    # Verify node is available
                    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
                    if ($nodeCheck) {{
                        Write-Host "[fnm] Node found at: $($nodeCheck.Source)"
                        Write-Host "[fnm] Node version: $(& node --version 2>&1)"
                    }} else {{
                        Write-Host "[fnm] WARNING: Node not found after fnm init"
                    }}
                }} catch {{
                    Write-Warning "[fnm] Failed to initialize: $_"
                }}
            }} else {{
                Write-Host "[fnm] fnm not found, using system PATH"
            }}
        }}

        # Initialize fnm if available (this will modify PATH)
        Initialize-Fnm

        # Debug current environment
        Write-Host "[Debug] Current PATH: $env:Path"
        Write-Host "[Debug] FNM_MULTISHELL_PATH: $env:FNM_MULTISHELL_PATH"

        # Check if package manager exists
        $pmPath = Get-Command {} -ErrorAction SilentlyContinue
        if (-not $pmPath) {{
            Write-Error "{} not found in PATH. Please ensure it is installed and accessible."

            # Try to provide helpful information
            Write-Host "[Debug] Searching for package manager..."

            # Check common locations for the package manager
            $pmLocations = @(
                "$env:APPDATA\npm\{}.cmd",
                "$env:APPDATA\npm\{}.ps1",
                "$env:ProgramFiles\nodejs\{}.cmd",
                "$env:LOCALAPPDATA\pnpm\{}.cmd",
                "$env:USERPROFILE\.bun\bin\{}.exe"
            )

            foreach ($loc in $pmLocations) {{
                if (Test-Path $loc) {{
                    Write-Host "[Debug] Found {} at: $loc"
                    # Try to use it directly
                    $env:Path = "$(Split-Path $loc);$env:Path"
                    $pmPath = Get-Command {} -ErrorAction SilentlyContinue
                    if ($pmPath) {{
                        Write-Host "[Debug] Successfully added to PATH"
                        break
                    }}
                }}
            }}

            if (-not $pmPath) {{
                if ('{}' -eq 'npm' -or '{}' -eq 'yarn' -or '{}' -eq 'pnpm') {{
                    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
                    if ($nodeCmd) {{
                        Write-Host "Node.js is installed at: $($nodeCmd.Source)"
                        Write-Host "Node version: $(& node --version 2>&1)"

                        # If node exists but package manager doesn't, suggest installation
                        if ('{}' -eq 'pnpm') {{
                            Write-Host "Try installing pnpm with: npm install -g pnpm"
                        }} elseif ('{}' -eq 'yarn') {{
                            Write-Host "Try installing yarn with: npm install -g yarn"
                        }}
                    }} else {{
                        Write-Host "Node.js is not found. Please install Node.js first."
                    }}
                }}

                exit 1
            }}
        }}

        Write-Host "[Package Manager] Using: $($pmPath.Source)"
        Write-Host "[Package Manager] Executing: {} {}"

        # Execute the command
        try {{
            Write-Host "[Package Manager] PATH before execution: $env:Path"
            $result = & {} {} 2>&1
            $result | Out-Host
            $exitCode = $LASTEXITCODE
            if ($null -eq $exitCode) {{ $exitCode = 0 }}
            if ($exitCode -ne 0) {{
                Write-Error "Command failed with exit code: $exitCode"
                exit $exitCode
            }}
        }} catch {{
            Write-Error "Failed to execute command: $_"
            exit 1
        }}
        "#,
        working_directory,              // 1. Set-Location -Path '{}'
        package_manager,                // 2. Get-Command {}
        package_manager.to_uppercase(), // 3. Write-Error "{} not found in PATH..."
        package_manager,                // 4. "$env:APPDATA\npm\{}.cmd"
        package_manager,                // 5. "$env:APPDATA\npm\{}.ps1"
        package_manager,                // 6. "$env:ProgramFiles\nodejs\{}.cmd"
        package_manager,                // 7. "$env:LOCALAPPDATA\pnpm\{}.cmd"
        package_manager,                // 8. "$env:USERPROFILE\.bun\bin\{}.exe"
        package_manager,                // 9. Write-Host "[Debug] Found {} at: $loc"
        package_manager,                // 10. Get-Command {}
        package_manager,                // 11. if ('{}' -eq 'npm'
        package_manager,                // 12. '{}' -eq 'yarn'
        package_manager,                // 13. '{}' -eq 'pnpm'
        package_manager,                // 14. if ('{}' -eq 'pnpm')
        package_manager,                // 15. elseif ('{}' -eq 'yarn')
        package_manager,                // 16. Write-Host "[Package Manager] Executing: {}
        command,                        // 17. {}"
        package_manager,                // 18. & {}
        command                         // 19. {}
    );

    execute_powershell_script(&ps_script, "PowerShell with fnm")
}

fn run_with_powershell_simple(
    package_manager: &str,
    command: &str,
    working_directory: &str,
) -> Result<String, String> {
    let ps_script = format!(
        r#"
        # Change to working directory
        Set-Location -Path '{}'

        # Refresh PATH to get latest system paths
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        # Try to add common Node.js paths if not in PATH
        $nodePaths = @(
            "$env:ProgramFiles\nodejs",
            "$env:ProgramFiles (x86)\nodejs",
            "$env:LOCALAPPDATA\Programs\nodejs",
            "$env:APPDATA\npm"
        )

        foreach ($nodePath in $nodePaths) {{
            if ((Test-Path $nodePath) -and ($env:Path -notlike "*$nodePath*")) {{
                $env:Path = "$nodePath;$env:Path"
                Write-Host "[PATH] Added Node.js path: $nodePath"
            }}
        }}

        # Check if package manager exists
        $pmPath = Get-Command {} -ErrorAction SilentlyContinue
        if (-not $pmPath) {{
            Write-Error "{} not found in PATH"
            exit 1
        }}

        Write-Host "[Package Manager] Using: $($pmPath.Source)"

        # Execute the command
        & {} {} 2>&1 | Out-Host
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {{
            Write-Error "Command failed with exit code: $exitCode"
            exit $exitCode
        }}
        "#,
        working_directory,
        package_manager,
        package_manager.to_uppercase(),
        package_manager,
        command
    );

    execute_powershell_script(&ps_script, "PowerShell simple")
}

fn run_direct_command(
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

fn execute_powershell_script(script: &str, method_name: &str) -> Result<String, String> {
    println!("[Package Manager] Trying method: {}", method_name);

    let mut ps_cmd = Command::new("powershell");
    ps_cmd.args(&[
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

fn filter_widgets_by_ids_internal(
    widgets: &[WidgetInstallInput],
    selected_ids: &[String],
) -> Vec<WidgetInstallInput> {
    use std::collections::HashSet;
    let id_set: HashSet<&String> = selected_ids.iter().collect();
    widgets
        .iter()
        .filter(|w| id_set.contains(&w.id))
        .cloned()
        .collect()
}

fn install_single_widget(widget: &WidgetInstallInput, package_manager: &str) -> InstallResult {
    println!(
        "[Batch Install] Installing dependencies for widget: {}",
        widget.caption
    );

    match run_package_manager_command(
        package_manager.to_string(),
        "install".to_string(),
        widget.path.clone(),
    ) {
        Ok(_) => {
            println!(
                "[Batch Install] Successfully installed dependencies for: {}",
                widget.caption
            );
            InstallResult {
                widget_id: widget.id.clone(),
                widget_caption: widget.caption.clone(),
                success: true,
                error: None,
            }
        }
        Err(e) => {
            println!(
                "[Batch Install] Failed to install dependencies for {}: {}",
                widget.caption, e
            );
            InstallResult {
                widget_id: widget.id.clone(),
                widget_caption: widget.caption.clone(),
                success: false,
                error: Some(e),
            }
        }
    }
}

#[tauri::command]
pub fn batch_install_widgets(
    widgets: Vec<WidgetInstallInput>,
    package_manager: String,
    selected_widget_ids: Option<Vec<String>>,
) -> Result<BatchInstallSummary, String> {
    let widgets_to_install = match selected_widget_ids {
        Some(ids) if !ids.is_empty() => filter_widgets_by_ids_internal(&widgets, &ids),
        _ => widgets,
    };

    if widgets_to_install.is_empty() {
        return Err("No widgets to install".to_string());
    }

    println!(
        "[Batch Install] Starting parallel installation for {} widgets using {}",
        widgets_to_install.len(),
        package_manager
    );

    let results: Vec<InstallResult> = widgets_to_install
        .par_iter()
        .map(|widget| install_single_widget(widget, &package_manager))
        .collect();

    let success_count = results.iter().filter(|r| r.success).count();
    let failure_count = results.iter().filter(|r| !r.success).count();
    let failed_widget_names: Vec<String> = results
        .iter()
        .filter(|r| !r.success)
        .map(|r| r.widget_caption.clone())
        .collect();

    println!(
        "[Batch Install] Completed: {} successful, {} failed",
        success_count, failure_count
    );

    Ok(BatchInstallSummary {
        results,
        failed_widget_names,
        success_count,
        failure_count,
    })
}
