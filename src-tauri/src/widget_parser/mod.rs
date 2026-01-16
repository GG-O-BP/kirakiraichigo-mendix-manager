use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

// Pure data types - immutable by design
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetProperty {
    pub key: String,
    pub property_type: String,
    pub caption: String,
    pub description: String,
    pub default_value: Option<String>,
    pub required: bool,
    pub options: Vec<String>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPropertyGroup {
    pub caption: String,
    pub properties: Vec<WidgetProperty>,
    #[serde(default)]
    pub property_groups: Vec<WidgetPropertyGroup>,
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

// Pure data structures for parsing state
#[derive(Debug, Clone)]
struct ParseContext {
    depth: usize,
    in_properties: bool,
    property_group_depth: usize, // Track nesting level of property groups
    current_element: String,
    text_buffer: String,
}

#[derive(Debug, Clone)]
struct ParseState {
    context: ParseContext,
    widget_name: String,
    widget_description: String,
    properties: Vec<WidgetProperty>,
    property_groups: Vec<WidgetPropertyGroup>,
    current_property: Option<WidgetProperty>,
    group_stack: Vec<WidgetPropertyGroup>, // Stack for nested groups
}

fn create_initial_context() -> ParseContext {
    ParseContext {
        depth: 0,
        in_properties: false,
        property_group_depth: 0,
        current_element: String::new(),
        text_buffer: String::new(),
    }
}

fn create_initial_state() -> ParseState {
    ParseState {
        context: create_initial_context(),
        widget_name: String::new(),
        widget_description: String::new(),
        properties: Vec::new(),
        property_groups: Vec::new(),
        current_property: None,
        group_stack: Vec::new(),
    }
}

// Pure attribute extraction functions
fn extract_string_attribute(
    attributes: &[quick_xml::events::attributes::Attribute],
    key: &[u8],
) -> Option<String> {
    attributes
        .iter()
        .find(|attr| attr.key.as_ref() == key)
        .map(|attr| String::from_utf8_lossy(&attr.value).to_string())
}

fn extract_bool_attribute(
    attributes: &[quick_xml::events::attributes::Attribute],
    key: &[u8],
) -> bool {
    extract_string_attribute(attributes, key)
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn extract_property_attributes(
    attributes: Vec<quick_xml::events::attributes::Attribute>,
) -> WidgetProperty {
    let attrs: Vec<_> = attributes.into_iter().collect();

    WidgetProperty {
        key: extract_string_attribute(&attrs, b"key").unwrap_or_default(),
        property_type: extract_string_attribute(&attrs, b"type").unwrap_or_default(),
        caption: String::new(),
        description: String::new(),
        default_value: extract_string_attribute(&attrs, b"defaultValue"),
        required: extract_bool_attribute(&attrs, b"required"),
        options: Vec::new(),
        category: None,
    }
}

fn extract_group_caption(attributes: Vec<quick_xml::events::attributes::Attribute>) -> String {
    let attrs: Vec<_> = attributes.into_iter().collect();
    extract_string_attribute(&attrs, b"caption").unwrap_or_default()
}

fn extract_enumeration_value(
    attributes: Vec<quick_xml::events::attributes::Attribute>,
) -> Option<String> {
    let attrs: Vec<_> = attributes.into_iter().collect();
    extract_string_attribute(&attrs, b"key")
}

// Pure state transformation functions
fn increment_depth(state: ParseState) -> ParseState {
    ParseState {
        context: ParseContext {
            depth: state.context.depth + 1,
            ..state.context
        },
        ..state
    }
}

fn decrement_depth(state: ParseState) -> ParseState {
    ParseState {
        context: ParseContext {
            depth: state.context.depth.saturating_sub(1),
            ..state.context
        },
        ..state
    }
}

fn set_in_properties(state: ParseState, value: bool) -> ParseState {
    ParseState {
        context: ParseContext {
            in_properties: value,
            ..state.context
        },
        ..state
    }
}

fn increment_property_group_depth(state: ParseState) -> ParseState {
    ParseState {
        context: ParseContext {
            property_group_depth: state.context.property_group_depth + 1,
            ..state.context
        },
        ..state
    }
}

fn decrement_property_group_depth(state: ParseState) -> ParseState {
    ParseState {
        context: ParseContext {
            property_group_depth: state.context.property_group_depth.saturating_sub(1),
            ..state.context
        },
        ..state
    }
}

fn is_in_property_group(state: &ParseState) -> bool {
    state.context.property_group_depth > 0
}

fn set_current_element(state: ParseState, element: String) -> ParseState {
    ParseState {
        context: ParseContext {
            current_element: element,
            text_buffer: String::new(),
            ..state.context
        },
        ..state
    }
}

fn append_text_buffer(state: ParseState, text: &str) -> ParseState {
    ParseState {
        context: ParseContext {
            text_buffer: format!("{}{}", state.context.text_buffer, text),
            ..state.context
        },
        ..state
    }
}

fn set_current_property(state: ParseState, property: WidgetProperty) -> ParseState {
    ParseState {
        current_property: Some(property),
        ..state
    }
}

fn push_group_to_stack(mut state: ParseState, group: WidgetPropertyGroup) -> ParseState {
    state.group_stack.push(group);
    state
}

fn add_option_to_current_property(mut state: ParseState, option: String) -> ParseState {
    if let Some(mut prop) = state.current_property.take() {
        prop.options.push(option);
        state.current_property = Some(prop);
    }
    state
}

fn update_property_caption(mut state: ParseState) -> ParseState {
    if let Some(mut prop) = state.current_property.take() {
        prop.caption = state.context.text_buffer.clone();
        state.current_property = Some(prop);
    }
    state
}

fn update_property_description(mut state: ParseState) -> ParseState {
    if let Some(mut prop) = state.current_property.take() {
        prop.description = state.context.text_buffer.clone();
        state.current_property = Some(prop);
    }
    state
}

fn update_widget_name(state: ParseState) -> ParseState {
    ParseState {
        widget_name: state.context.text_buffer.clone(),
        ..state
    }
}

fn update_widget_description(state: ParseState) -> ParseState {
    if state.context.depth == 2 {
        ParseState {
            widget_description: state.context.text_buffer.clone(),
            ..state
        }
    } else {
        update_property_description(state)
    }
}

fn finalize_current_property(mut state: ParseState) -> ParseState {
    if let Some(property) = state.current_property.take() {
        if is_in_property_group(&state) {
            finalize_property_to_group(state, property)
        } else {
            finalize_property_to_root(state, property)
        }
    } else {
        state
    }
}

fn finalize_property_to_group(mut state: ParseState, property: WidgetProperty) -> ParseState {
    // Add property to the current group (top of stack)
    if let Some(group) = state.group_stack.last_mut() {
        group.properties.push(property);
    }
    state.current_property = None;
    state
}

fn finalize_property_to_root(mut state: ParseState, property: WidgetProperty) -> ParseState {
    state.properties.push(property);
    state.current_property = None;
    state
}

fn finalize_current_group(mut state: ParseState) -> ParseState {
    // Pop the current group from stack
    if let Some(completed_group) = state.group_stack.pop() {
        // If there's a parent group, add as nested group
        if let Some(parent_group) = state.group_stack.last_mut() {
            parent_group.property_groups.push(completed_group);
        } else {
            // No parent, add to root property_groups
            state.property_groups.push(completed_group);
        }
    }
    state
}

// Pure event processing functions
fn process_start_event(
    state: ParseState,
    name: &[u8],
    attributes: Vec<quick_xml::events::attributes::Attribute>,
) -> ParseState {
    let incremented_state = increment_depth(state);

    match name {
        b"widget" => incremented_state,
        b"name" => set_current_element(incremented_state, "name".to_string()),
        b"description" => set_current_element(incremented_state, "description".to_string()),
        b"properties" => set_in_properties(incremented_state, true),
        b"propertyGroup" => {
            let group_caption = extract_group_caption(attributes);
            let group = WidgetPropertyGroup {
                caption: group_caption,
                properties: Vec::new(),
                property_groups: Vec::new(),
            };
            push_group_to_stack(increment_property_group_depth(incremented_state), group)
        }
        b"property" => {
            if incremented_state.context.in_properties {
                let property = extract_property_attributes(attributes);
                set_current_property(incremented_state, property)
            } else {
                incremented_state
            }
        }
        b"caption" => set_current_element(incremented_state, "caption".to_string()),
        b"enumerationValue" => extract_enumeration_value(attributes)
            .map_or(incremented_state.clone(), |value| {
                add_option_to_current_property(incremented_state, value)
            }),
        _ => {
            let element_name = String::from_utf8_lossy(name).to_string();
            set_current_element(incremented_state, element_name)
        }
    }
}

fn process_end_event(state: ParseState, name: &[u8]) -> ParseState {
    let decremented_state = decrement_depth(state);

    match name {
        b"properties" => set_in_properties(decremented_state, false),
        b"propertyGroup" => finalize_current_group(decrement_property_group_depth(decremented_state)),
        b"property" => finalize_current_property(decremented_state),
        _ => set_current_element(decremented_state, String::new()),
    }
}

fn process_text_event(state: ParseState, text: &str) -> ParseState {
    let text_updated_state = append_text_buffer(state, text);
    let element = text_updated_state.context.current_element.clone();

    match element.as_str() {
        "name" => update_widget_name(text_updated_state),
        "description" => update_widget_description(text_updated_state),
        "caption" => update_property_caption(text_updated_state),
        _ => text_updated_state,
    }
}

// Pure XML parsing function
fn parse_xml_events<F>(xml_content: &str, mut event_processor: F) -> Result<ParseState, ParseError>
where
    F: FnMut(ParseState, Event) -> ParseState,
{
    let mut reader = Reader::from_str(xml_content);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    let mut state = create_initial_state();

    loop {
        match reader.read_event_into(&mut buf) {
            Err(e) => {
                return Err(ParseError::XmlParseError(format!(
                    "XML parsing error: {}",
                    e
                )))
            }
            Ok(Event::Eof) => break,
            Ok(event) => {
                state = event_processor(state, event);
            }
        }
        buf.clear();
    }

    Ok(state)
}

fn process_xml_event(state: ParseState, event: Event) -> ParseState {
    match event {
        Event::Start(e) => {
            let attributes: Result<Vec<_>, _> = e.attributes().collect();
            match attributes {
                Ok(attrs) => process_start_event(state, e.name().as_ref(), attrs),
                Err(_) => state,
            }
        }
        Event::End(e) => process_end_event(state, e.name().as_ref()),
        Event::Text(e) => match e.decode() {
            Ok(text) => process_text_event(state, &text),
            Err(_) => state,
        },
        Event::CData(e) => match std::str::from_utf8(e.as_ref()) {
            Ok(text) => process_text_event(state, text),
            Err(_) => state,
        },
        _ => state,
    }
}

// Pure conversion functions
fn state_to_widget_definition(state: ParseState) -> WidgetDefinition {
    WidgetDefinition {
        name: state.widget_name,
        description: state.widget_description,
        properties: state.properties,
        property_groups: state.property_groups,
    }
}

fn parse_xml_content(xml_content: &str) -> Result<WidgetDefinition, ParseError> {
    parse_xml_events(xml_content, process_xml_event).map(state_to_widget_definition)
}

// Pure file filtering functions
fn is_xml_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext == "xml")
        .unwrap_or(false)
}

fn is_not_package_xml(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name != "package.xml")
        .unwrap_or(false)
}

fn is_widget_xml_file(path: &Path) -> bool {
    is_xml_file(path) && is_not_package_xml(path)
}

// IO functions - only these perform side effects
fn read_directory_entries(dir_path: &Path) -> Result<Vec<std::fs::DirEntry>, ParseError> {
    fs::read_dir(dir_path)
        .map_err(|e| ParseError::FileNotFound(format!("Cannot read src directory: {}", e)))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| ParseError::FileNotFound(format!("Cannot read directory entry: {}", e)))
}

fn find_widget_xml_in_entries(entries: Vec<std::fs::DirEntry>) -> Option<String> {
    entries
        .into_iter()
        .map(|entry| entry.path())
        .find(|path| is_widget_xml_file(path))
        .map(|path| path.to_string_lossy().to_string())
}

fn find_widget_xml_file(widget_path: &str) -> Result<String, ParseError> {
    let src_path = Path::new(widget_path).join("src");

    if !src_path.exists() {
        return Err(ParseError::FileNotFound(format!(
            "src directory not found in {}",
            widget_path
        )));
    }

    read_directory_entries(&src_path).and_then(|entries| {
        find_widget_xml_in_entries(entries)
            .ok_or_else(|| ParseError::FileNotFound("Widget XML file not found".to_string()))
    })
}

fn read_file_content(file_path: &str) -> Result<String, ParseError> {
    fs::read_to_string(file_path)
        .map_err(|e| ParseError::FileNotFound(format!("Failed to read {}: {}", file_path, e)))
}

// Pure validation function
fn contains_mendix_string(content: &str) -> bool {
    content.to_lowercase().contains("mendix")
}

// Validation function for Mendix widget
fn validate_mendix_package_xml(widget_path: &str) -> Result<bool, ParseError> {
    let package_xml_path = Path::new(widget_path).join("src").join("package.xml");

    if !package_xml_path.exists() {
        return Err(ParseError::FileNotFound(format!(
            "src/package.xml not found in {}",
            widget_path
        )));
    }

    read_file_content(&package_xml_path.to_string_lossy())
        .map(|content| contains_mendix_string(&content))
}

// Main API function - composes pure functions with minimal IO
pub fn parse_widget_xml(widget_path: &str) -> Result<WidgetDefinition, ParseError> {
    find_widget_xml_file(widget_path)
        .and_then(|xml_path| read_file_content(&xml_path))
        .and_then(|xml_content| parse_xml_content(&xml_content))
}

#[tauri::command]
pub fn parse_widget_properties(widget_path: String) -> Result<WidgetDefinition, String> {
    parse_widget_xml(&widget_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn validate_mendix_widget(widget_path: String) -> Result<bool, String> {
    validate_mendix_package_xml(&widget_path).map_err(|e| e.to_string())
}

// EditorConfig response type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorConfigResult {
    pub found: bool,
    pub content: Option<String>,
    pub file_path: Option<String>,
}

// Pure file filtering function for editorConfig
fn is_editor_config_file(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.ends_with(".editorConfig.js") || name.ends_with(".editorConfig.ts"))
        .unwrap_or(false)
}

// Find editorConfig file in widget src directory
fn find_editor_config_file(widget_path: &str) -> Option<String> {
    let src_path = Path::new(widget_path).join("src");

    if !src_path.exists() {
        return None;
    }

    let entries = read_directory_entries(&src_path).ok()?;
    entries
        .into_iter()
        .map(|entry| entry.path())
        .find(|path| is_editor_config_file(path))
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_editor_config(widget_path: String) -> Result<EditorConfigResult, String> {
    match find_editor_config_file(&widget_path) {
        Some(config_path) => {
            match read_file_content(&config_path) {
                Ok(content) => Ok(EditorConfigResult {
                    found: true,
                    content: Some(content),
                    file_path: Some(config_path),
                }),
                Err(e) => Err(format!("Failed to read editorConfig: {}", e)),
            }
        }
        None => Ok(EditorConfigResult {
            found: false,
            content: None,
            file_path: None,
        }),
    }
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
