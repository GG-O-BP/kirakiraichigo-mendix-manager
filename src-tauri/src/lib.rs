use chrono::{DateTime, Local};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::{Command, Stdio};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MendixVersion {
    pub version: String,
    pub path: String,
    pub exe_path: String,
    pub install_date: Option<DateTime<Local>>,
    pub is_valid: bool,
}

impl MendixVersion {
    fn new(version: String, path: String) -> Self {
        let exe_path = format!("{}\\modeler\\studiopro.exe", path);
        let is_valid = Path::new(&exe_path).exists();

        let install_date = if let Ok(metadata) = fs::metadata(&path) {
            metadata
                .created()
                .ok()
                .and_then(|time| {
                    DateTime::from_timestamp(
                        time.duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() as i64,
                        0,
                    )
                })
                .map(|dt| dt.with_timezone(&Local))
        } else {
            None
        };

        Self {
            version,
            path,
            exe_path,
            install_date,
            is_valid,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MendixApp {
    pub name: String,
    pub path: String,
    pub version: Option<String>,
    pub last_modified: Option<DateTime<Local>>,
    pub is_valid: bool,
}

impl MendixApp {
    fn new(name: String, path: String) -> Self {
        let project_settings_path = format!("{}\\project-settings.user.json", path);
        let is_valid = Path::new(&project_settings_path).exists();

        let last_modified = if let Ok(metadata) = fs::metadata(&path) {
            metadata
                .modified()
                .ok()
                .and_then(|time| {
                    DateTime::from_timestamp(
                        time.duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() as i64,
                        0,
                    )
                })
                .map(|dt| dt.with_timezone(&Local))
        } else {
            None
        };

        let version = if is_valid {
            extract_version_from_project_settings(&project_settings_path)
        } else {
            None
        };

        Self {
            name,
            path,
            version,
            last_modified,
            is_valid,
        }
    }
}

fn extract_version_from_project_settings(file_path: &str) -> Option<String> {
    let content = fs::read_to_string(file_path).ok()?;
    let json_value: serde_json::Value = serde_json::from_str(&content).ok()?;

    let settings_parts = json_value.get("settingsParts")?.as_array()?;

    for part in settings_parts {
        if let Some(type_str) = part.get("type").and_then(|t| t.as_str()) {
            if type_str.contains("Version=") {
                let version_regex = Regex::new(r"Version=(\d+\.\d+\.\d+)").ok()?;
                if let Some(captures) = version_regex.captures(type_str) {
                    if let Some(version_match) = captures.get(1) {
                        return Some(version_match.as_str().to_string());
                    }
                }
            }
        }
    }

    None
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_installed_mendix_versions() -> Result<Vec<MendixVersion>, String> {
    let mendix_dir = "C:\\Program Files\\Mendix";

    if !Path::new(mendix_dir).exists() {
        return Ok(Vec::new());
    }

    let version_regex = Regex::new(r"^(\d+\.\d+\.\d+)").map_err(|e| e.to_string())?;
    let mut versions = Vec::new();

    for entry in WalkDir::new(mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                if let Some(captures) = version_regex.captures(dir_name) {
                    if let Some(version_match) = captures.get(1) {
                        let version_str = version_match.as_str().to_string();
                        let path = entry.path().to_string_lossy().to_string();
                        let mendix_version = MendixVersion::new(version_str, path);

                        if mendix_version.is_valid {
                            versions.push(mendix_version);
                        }
                    }
                }
            }
        }
    }

    // Sort versions in descending order (newest first)
    versions.sort_by(|a, b| {
        let parse_version = |version: &str| -> Vec<u32> {
            version.split('.').map(|s| s.parse().unwrap_or(0)).collect()
        };

        let a_parts = parse_version(&a.version);
        let b_parts = parse_version(&b.version);

        b_parts.cmp(&a_parts)
    });

    Ok(versions)
}

#[tauri::command]
fn launch_studio_pro(version: String) -> Result<(), String> {
    let mendix_dir = "C:\\Program Files\\Mendix";
    let version_regex = Regex::new(r"^(\d+\.\d+\.\d+)").map_err(|e| e.to_string())?;

    // Find the directory that starts with the version
    for entry in WalkDir::new(mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                if let Some(captures) = version_regex.captures(dir_name) {
                    if let Some(version_match) = captures.get(1) {
                        if version_match.as_str() == version {
                            let exe_path = entry.path().join("modeler").join("studiopro.exe");

                            if exe_path.exists() {
                                Command::new(&exe_path)
                                    .spawn()
                                    .map_err(|e| format!("Failed to launch Studio Pro: {}", e))?;
                                return Ok(());
                            } else {
                                return Err("Studio Pro executable not found".to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    Err(format!("Version {} not found", version))
}

#[tauri::command]
fn uninstall_studio_pro(version: String) -> Result<(), String> {
    let mendix_data_dir = "C:\\ProgramData\\Mendix";

    // Find the version directory that starts with the version
    for entry in WalkDir::new(mendix_data_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                if dir_name.starts_with(&version) {
                    let uninstall_path = entry.path().join("uninst").join("unins000.exe");

                    if uninstall_path.exists() {
                        Command::new(&uninstall_path)
                            .arg("/SILENT")
                            .spawn()
                            .map_err(|e| format!("Failed to launch uninstaller: {}", e))?;
                        return Ok(());
                    } else {
                        return Err("Uninstaller not found".to_string());
                    }
                }
            }
        }
    }

    Err(format!("Version {} not found for uninstall", version))
}

#[tauri::command]
fn check_version_folder_exists(version: String) -> Result<bool, String> {
    let mendix_dir = "C:\\Program Files\\Mendix";

    if !Path::new(mendix_dir).exists() {
        return Ok(false);
    }

    for entry in WalkDir::new(mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                if dir_name.starts_with(&version) {
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
}

#[tauri::command]
fn delete_mendix_app(app_path: String) -> Result<(), String> {
    let path = Path::new(&app_path);

    if !path.exists() {
        return Err("App folder does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    fs::remove_dir_all(path).map_err(|e| format!("Failed to delete app folder: {}", e))?;

    Ok(())
}

#[tauri::command]
fn get_apps_by_version(version: String) -> Result<Vec<MendixApp>, String> {
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Failed to get user home directory")?;
    let mendix_dir = format!("{}\\Mendix", home_dir);

    if !Path::new(&mendix_dir).exists() {
        return Ok(Vec::new());
    }

    let mut matching_apps = Vec::new();

    for entry in WalkDir::new(&mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                let path = entry.path().to_string_lossy().to_string();
                let app = MendixApp::new(dir_name.to_string(), path);

                if app.is_valid && app.version.as_ref() == Some(&version) {
                    matching_apps.push(app);
                }
            }
        }
    }

    Ok(matching_apps)
}

#[tauri::command]
fn get_installed_mendix_apps() -> Result<Vec<MendixApp>, String> {
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Failed to get user home directory")?;
    let mendix_dir = format!("{}\\Mendix", home_dir);

    if !Path::new(&mendix_dir).exists() {
        return Ok(Vec::new());
    }

    let mut apps = Vec::new();

    for entry in WalkDir::new(&mendix_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.depth() == 1 && entry.file_type().is_dir() {
            if let Some(dir_name) = entry.file_name().to_str() {
                let path = entry.path().to_string_lossy().to_string();
                let app = MendixApp::new(dir_name.to_string(), path);

                if app.is_valid {
                    apps.push(app);
                }
            }
        }
    }

    // Sort by last modified date (newest first)
    apps.sort_by(|a, b| match (a.last_modified, b.last_modified) {
        (Some(a_time), Some(b_time)) => b_time.cmp(&a_time),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => a.name.cmp(&b.name),
    });

    Ok(apps)
}

#[tauri::command]
fn run_package_manager_command(
    package_manager: String,
    command: String,
    working_directory: String,
) -> Result<String, String> {
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

    // Try method 1: Direct Node.js search (bypass fnm)
    match run_with_direct_node_search(&package_manager, &command, &working_directory) {
        Ok(output) => return Ok(output),
        Err(err) => {
            println!("[Package Manager] Method 1 (direct node) failed: {}", err);
        }
    }

    // Try method 2: Simple fnm method
    match run_with_fnm_simple(&package_manager, &command, &working_directory) {
        Ok(output) => return Ok(output),
        Err(err) => {
            println!("[Package Manager] Method 2 (fnm simple) failed: {}", err);
        }
    }

    // Try method 3: PowerShell with fnm support
    match run_with_powershell_fnm(&package_manager, &command, &working_directory) {
        Ok(output) => return Ok(output),
        Err(err) => {
            println!("[Package Manager] Method 3 (fnm complex) failed: {}", err);
        }
    }

    // Try method 4: PowerShell without fnm
    match run_with_powershell_simple(&package_manager, &command, &working_directory) {
        Ok(output) => return Ok(output),
        Err(err) => {
            println!("[Package Manager] Method 4 (simple) failed: {}", err);
        }
    }

    // Try method 5: Direct command execution
    match run_direct_command(&package_manager, &command, &working_directory) {
        Ok(output) => return Ok(output),
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
    cmd.args(command.split_whitespace())
        .current_dir(working_directory)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

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

#[tauri::command]
fn copy_widget_to_apps(widget_path: String, app_paths: Vec<String>) -> Result<Vec<String>, String> {
    let source_dir = Path::new(&widget_path).join("dist").join("1.0.0");

    if !source_dir.exists() {
        return Err(format!("Widget dist folder not found: {:?}", source_dir));
    }

    let mut successful_apps = Vec::new();

    for app_path in app_paths {
        let target_dir = Path::new(&app_path).join("widgets");

        // Create widgets directory if it doesn't exist
        if !target_dir.exists() {
            fs::create_dir_all(&target_dir)
                .map_err(|e| format!("Failed to create widgets directory: {}", e))?;
        }

        // Copy all files from source to target
        for entry in WalkDir::new(&source_dir).min_depth(1) {
            let entry = entry.map_err(|e| format!("Failed to read source directory: {}", e))?;
            let source_path = entry.path();

            // Get relative path from source directory
            let relative_path = source_path
                .strip_prefix(&source_dir)
                .map_err(|e| format!("Failed to get relative path: {}", e))?;

            let target_path = target_dir.join(relative_path);

            if entry.file_type().is_dir() {
                fs::create_dir_all(&target_path)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            } else {
                // Copy file
                fs::copy(source_path, &target_path)
                    .map_err(|e| format!("Failed to copy file: {}", e))?;
            }
        }

        successful_apps.push(app_path);
    }

    Ok(successful_apps)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_installed_mendix_versions,
            launch_studio_pro,
            uninstall_studio_pro,
            check_version_folder_exists,
            delete_mendix_app,
            get_apps_by_version,
            get_installed_mendix_apps,
            run_package_manager_command,
            copy_widget_to_apps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
