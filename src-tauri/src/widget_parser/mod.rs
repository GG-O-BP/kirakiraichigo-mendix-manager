use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetProperty {
    pub key: String,
    pub property_type: String,
    pub caption: String,
    pub description: String,
    pub default_value: Option<String>,
    pub required: bool,
    pub options: Vec<String>, // For enumeration types
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPropertyGroup {
    pub caption: String,
    pub properties: Vec<WidgetProperty>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetDefinition {
    pub name: String,
    pub description: String,
    pub properties: Vec<WidgetProperty>,
    pub property_groups: Vec<WidgetPropertyGroup>,
}

#[derive(Debug)]
pub enum ParseError {
    FileNotFound(String),
    XmlParseError(String),
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParseError::FileNotFound(msg) => write!(f, "File not found: {}", msg),
            ParseError::XmlParseError(msg) => write!(f, "XML parse error: {}", msg),
        }
    }
}

impl std::error::Error for ParseError {}

pub fn parse_widget_xml(widget_path: &str) -> Result<WidgetDefinition, ParseError> {
    let xml_path = find_widget_xml_file(widget_path)?;
    let xml_content = fs::read_to_string(&xml_path)
        .map_err(|e| ParseError::FileNotFound(format!("Failed to read {}: {}", xml_path, e)))?;

    parse_xml_content(&xml_content)
}

fn find_widget_xml_file(widget_path: &str) -> Result<String, ParseError> {
    let src_path = Path::new(widget_path).join("src");

    if !src_path.exists() {
        return Err(ParseError::FileNotFound(format!(
            "src directory not found in {}",
            widget_path
        )));
    }

    // Find XML files in src directory
    let entries = fs::read_dir(&src_path)
        .map_err(|e| ParseError::FileNotFound(format!("Cannot read src directory: {}", e)))?;

    for entry in entries {
        let entry = entry
            .map_err(|e| ParseError::FileNotFound(format!("Cannot read directory entry: {}", e)))?;
        let path = entry.path();

        if let Some(extension) = path.extension() {
            if extension == "xml" {
                if let Some(file_name) = path.file_name() {
                    let file_name_str = file_name.to_string_lossy();
                    // Skip package.xml, find the widget definition XML
                    if file_name_str != "package.xml" {
                        return Ok(path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    Err(ParseError::FileNotFound(
        "Widget XML file not found".to_string(),
    ))
}

fn parse_xml_content(xml_content: &str) -> Result<WidgetDefinition, ParseError> {
    let mut reader = Reader::from_str(xml_content);
    reader.config_mut().trim_text(true);

    let mut buf = Vec::new();
    let mut widget_name = String::new();
    let mut widget_description = String::new();
    let mut properties = Vec::new();
    let mut property_groups = Vec::new();

    let mut current_property: Option<WidgetProperty> = None;
    let mut current_group: Option<WidgetPropertyGroup> = None;
    let mut current_element = String::new();
    let mut text_buffer = String::new();
    let mut in_properties = false;
    let mut in_property_group = false;
    let mut depth = 0;

    loop {
        match reader.read_event_into(&mut buf) {
            Err(e) => {
                return Err(ParseError::XmlParseError(format!(
                    "XML parsing error: {}",
                    e
                )))
            }
            Ok(Event::Eof) => break,

            Ok(Event::Start(e)) => {
                depth += 1;

                match e.name().as_ref() {
                    b"widget" => {
                        // Widget root element - extract attributes if needed
                    }
                    b"name" => {
                        current_element = "name".to_string();
                        text_buffer.clear();
                    }
                    b"description" => {
                        current_element = "description".to_string();
                        text_buffer.clear();
                    }
                    b"properties" => {
                        in_properties = true;
                    }
                    b"propertyGroup" => {
                        in_property_group = true;
                        let mut group_caption = String::new();

                        // Extract caption from attributes
                        for attr in e.attributes() {
                            if let Ok(attr) = attr {
                                if attr.key.as_ref() == b"caption" {
                                    group_caption =
                                        String::from_utf8_lossy(&attr.value).to_string();
                                }
                            }
                        }

                        current_group = Some(WidgetPropertyGroup {
                            caption: group_caption,
                            properties: Vec::new(),
                        });
                    }
                    b"property" => {
                        if in_properties {
                            let mut prop_key = String::new();
                            let mut prop_type = String::new();
                            let mut prop_required = false;
                            let mut prop_default = None;

                            // Extract attributes
                            for attr in e.attributes() {
                                if let Ok(attr) = attr {
                                    match attr.key.as_ref() {
                                        b"key" => {
                                            prop_key =
                                                String::from_utf8_lossy(&attr.value).to_string()
                                        }
                                        b"type" => {
                                            prop_type =
                                                String::from_utf8_lossy(&attr.value).to_string()
                                        }
                                        b"required" => {
                                            prop_required =
                                                String::from_utf8_lossy(&attr.value) == "true"
                                        }
                                        b"defaultValue" => {
                                            prop_default = Some(
                                                String::from_utf8_lossy(&attr.value).to_string(),
                                            )
                                        }
                                        _ => {}
                                    }
                                }
                            }

                            current_property = Some(WidgetProperty {
                                key: prop_key,
                                property_type: prop_type,
                                caption: String::new(),
                                description: String::new(),
                                default_value: prop_default,
                                required: prop_required,
                                options: Vec::new(),
                                category: None,
                            });
                        }
                    }
                    b"caption" => {
                        current_element = "caption".to_string();
                        text_buffer.clear();
                    }
                    b"enumerationValue" => {
                        if let Some(ref mut prop) = current_property {
                            // Extract enumeration value
                            for attr in e.attributes() {
                                if let Ok(attr) = attr {
                                    if attr.key.as_ref() == b"key" {
                                        prop.options
                                            .push(String::from_utf8_lossy(&attr.value).to_string());
                                    }
                                }
                            }
                        }
                    }
                    _ => {
                        current_element = String::from_utf8_lossy(e.name().as_ref()).to_string();
                        text_buffer.clear();
                    }
                }
            }

            Ok(Event::End(e)) => {
                depth -= 1;

                match e.name().as_ref() {
                    b"properties" => {
                        in_properties = false;
                    }
                    b"propertyGroup" => {
                        if let Some(group) = current_group.take() {
                            property_groups.push(group);
                        }
                        in_property_group = false;
                    }
                    b"property" => {
                        if let Some(prop) = current_property.take() {
                            if in_property_group {
                                if let Some(ref mut group) = current_group {
                                    group.properties.push(prop);
                                }
                            } else {
                                properties.push(prop);
                            }
                        }
                    }
                    _ => {}
                }

                current_element.clear();
            }

            Ok(Event::Text(e)) => {
                let text = e
                    .unescape()
                    .map_err(|e| ParseError::XmlParseError(format!("Text decode error: {}", e)))?;
                text_buffer.push_str(&text);

                // Assign text to appropriate fields
                match current_element.as_str() {
                    "name" => widget_name = text_buffer.clone(),
                    "description" => {
                        if depth == 2 {
                            // Widget description
                            widget_description = text_buffer.clone();
                        } else if let Some(ref mut prop) = current_property {
                            prop.description = text_buffer.clone();
                        }
                    }
                    "caption" => {
                        if let Some(ref mut prop) = current_property {
                            prop.caption = text_buffer.clone();
                        }
                    }
                    _ => {}
                }
            }

            Ok(Event::CData(e)) => {
                let text = std::str::from_utf8(e.as_ref())
                    .map_err(|e| ParseError::XmlParseError(format!("CData decode error: {}", e)))?;
                text_buffer.push_str(&text);
            }

            _ => {}
        }

        buf.clear();
    }

    Ok(WidgetDefinition {
        name: widget_name,
        description: widget_description,
        properties,
        property_groups,
    })
}

#[tauri::command]
pub fn parse_widget_properties(widget_path: String) -> Result<WidgetDefinition, String> {
    parse_widget_xml(&widget_path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_widget() {
        let xml = r#"<?xml version="1.0" encoding="utf-8"?>
<widget id="com.example.MyWidget" needsEntityContext="true" xmlns="http://www.mendix.com/widget/1.0/">
    <name>My Widget</name>
    <description>A simple test widget</description>
    <properties>
        <property key="caption" type="string" required="true">
            <caption>Caption</caption>
            <description>The caption of the widget</description>
        </property>
        <property key="showLabel" type="boolean" defaultValue="true">
            <caption>Show Label</caption>
            <description>Whether to show the label</description>
        </property>
        <property key="alignment" type="enumeration" defaultValue="left">
            <caption>Alignment</caption>
            <description>Text alignment</description>
            <enumerationValue key="left">Left</enumerationValue>
            <enumerationValue key="center">Center</enumerationValue>
            <enumerationValue key="right">Right</enumerationValue>
        </property>
    </properties>
</widget>"#;

        let result = parse_xml_content(xml).unwrap();

        assert_eq!(result.name, "My Widget");
        assert_eq!(result.description, "A simple test widget");
        assert_eq!(result.properties.len(), 3);

        let caption_prop = &result.properties[0];
        assert_eq!(caption_prop.key, "caption");
        assert_eq!(caption_prop.property_type, "string");
        assert_eq!(caption_prop.required, true);

        let alignment_prop = &result.properties[2];
        assert_eq!(alignment_prop.options.len(), 3);
        assert!(alignment_prop.options.contains(&"left".to_string()));
    }
}
