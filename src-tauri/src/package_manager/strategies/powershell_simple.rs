use crate::package_manager::strategy::ExecutionStrategy;
use crate::package_manager::powershell::execute_powershell_script;

/// Strategy 4: Simple PowerShell execution
///
/// Refreshes PATH and adds common Node.js paths without fnm.
/// Suitable for systems with standard Node.js installations.
pub struct PowershellSimpleStrategy;

impl ExecutionStrategy for PowershellSimpleStrategy {
    fn name(&self) -> &'static str {
        "powershell_simple"
    }

    fn execute(
        &self,
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
}
