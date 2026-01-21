use crate::package_manager::strategy::ExecutionStrategy;
use crate::package_manager::powershell::execute_powershell_script;

/// Strategy 1: Direct Node.js search
///
/// Searches for Node.js in common installation locations and
/// executes the package manager directly without relying on fnm.
pub struct DirectNodeStrategy;

impl ExecutionStrategy for DirectNodeStrategy {
    fn name(&self) -> &'static str {
        "direct_node"
    }

    fn execute(
        &self,
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
}
