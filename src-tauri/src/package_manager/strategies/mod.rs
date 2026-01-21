mod direct_command;
mod direct_node;
mod fnm_simple;
mod powershell_fnm;
mod powershell_simple;

pub use direct_command::DirectCommandStrategy;
pub use direct_node::DirectNodeStrategy;
pub use fnm_simple::FnmSimpleStrategy;
pub use powershell_fnm::PowershellFnmStrategy;
pub use powershell_simple::PowershellSimpleStrategy;

use super::strategy::ExecutionStrategy;

/// Returns all available execution strategies in priority order
pub fn all_strategies() -> Vec<Box<dyn ExecutionStrategy>> {
    vec![
        Box::new(DirectNodeStrategy),
        Box::new(FnmSimpleStrategy),
        Box::new(PowershellFnmStrategy),
        Box::new(PowershellSimpleStrategy),
        Box::new(DirectCommandStrategy),
    ]
}
