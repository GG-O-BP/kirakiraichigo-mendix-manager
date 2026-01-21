use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Widget {
    pub id: String,
    pub caption: String,
    pub path: String,
}

pub fn searchable_fields_widget(item: &Widget) -> Option<String> {
    Some(format!("{} {}", item.caption, item.path))
}

pub fn create_widget(caption: String, path: String) -> Result<Widget, String> {
    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string());

    Ok(Widget { id, caption, path })
}
