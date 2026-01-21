use crate::package_manager::strategy::ExecutionStrategy;
use crate::package_manager::powershell::execute_powershell_script;

/// Strategy 3: PowerShell with fnm support
///
/// Comprehensive fnm initialization with PATH refresh and
/// detailed debugging output. Handles .nvmrc and .node-version files.
pub struct PowershellFnmStrategy;

impl ExecutionStrategy for PowershellFnmStrategy {
    fn name(&self) -> &'static str {
        "powershell_fnm"
    }

    fn execute(
        &self,
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
}
