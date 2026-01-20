use crate::package_manager::strategy::ExecutionStrategy;
use crate::package_manager::powershell::execute_powershell_script;

/// Strategy 2: Simple fnm method
///
/// Uses fnm (Fast Node Manager) with simple environment initialization.
/// Falls back to checking common locations if the package manager isn't found.
pub struct FnmSimpleStrategy;

impl ExecutionStrategy for FnmSimpleStrategy {
    fn name(&self) -> &'static str {
        "fnm_simple"
    }

    fn execute(
        &self,
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
}
