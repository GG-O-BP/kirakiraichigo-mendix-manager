use quick_xml::events::Event;
use quick_xml::Reader;
use std::path::Path;

#[derive(Debug)]
pub struct WidgetMetadata {
    pub name: String,
    pub id: String,
}

pub fn parse_widget_metadata(widget_path: &Path) -> Result<WidgetMetadata, String> {
    let package_json_path = widget_path.join("package.json");
    if !package_json_path.exists() {
        return Err("package.json not found".to_string());
    }

    let content = std::fs::read_to_string(&package_json_path)
        .map_err(|e| format!("Failed to read package.json: {}", e))?;

    let json: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse package.json: {}", e))?;

    let widget_name = json["widgetName"]
        .as_str()
        .ok_or("widgetName not found in package.json")?
        .to_string();

    let src_dir = widget_path.join("src");
    let widget_id = find_widget_id_in_directory(&src_dir).unwrap_or_else(|| widget_name.clone());

    Ok(WidgetMetadata {
        name: widget_name,
        id: widget_id,
    })
}

/// Find widget id from XML files in the source directory using proper XML parsing
pub fn find_widget_id_in_directory(src_dir: &Path) -> Option<String> {
    let entries = std::fs::read_dir(src_dir).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("xml") {
            if let Some(id) = extract_widget_id_from_xml(&path) {
                return Some(id);
            }
        }
    }

    None
}

/// Extract widget id attribute from XML file using quick_xml
pub fn extract_widget_id_from_xml(xml_path: &Path) -> Option<String> {
    let xml_content = std::fs::read_to_string(xml_path).ok()?;
    let mut reader = Reader::from_str(&xml_content);
    reader.config_mut().trim_text(true);

    loop {
        match reader.read_event() {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                // Look for 'widget' element and extract 'id' attribute
                if e.name().as_ref() == b"widget" {
                    for attr in e.attributes().flatten() {
                        if attr.key.as_ref() == b"id" {
                            return attr.unescape_value().ok().map(|v| v.into_owned());
                        }
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
    }

    None
}
