use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    pub options: Vec<String>,
    pub category: Option<String>,
    #[serde(rename = "dataSource", skip_serializing_if = "Option::is_none")]
    pub data_source: Option<String>,
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
        data_source: extract_string_attribute(&attrs, b"dataSource"),
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
    if let Some(completed_group) = state.group_stack.pop() {
        if let Some(parent_group) = state.group_stack.last_mut() {
            parent_group.property_groups.push(completed_group);
        } else {
            state.property_groups.push(completed_group);
        }
    }
    state
}

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

fn contains_mendix_string(content: &str) -> bool {
    content.to_lowercase().contains("mendix")
}

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

pub fn parse_widget_xml(widget_path: &str) -> Result<WidgetDefinition, ParseError> {
    find_widget_xml_file(widget_path)
        .and_then(|xml_path| read_file_content(&xml_path))
        .and_then(|xml_content| parse_xml_content(&xml_content))
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

fn is_editor_config_file(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.ends_with(".editorConfig.js") || name.ends_with(".editorConfig.ts"))
        .unwrap_or(false)
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PropertyValue {
    String(String),
    Boolean(bool),
    Integer(i64),
    Decimal(f64),
}

fn get_default_value_for_type_internal(property_type: &str) -> PropertyValue {
    match property_type {
        "string" => PropertyValue::String(String::new()),
        "boolean" => PropertyValue::Boolean(false),
        "integer" => PropertyValue::Integer(0),
        "decimal" => PropertyValue::Decimal(0.0),
        "enumeration" => PropertyValue::String(String::new()),
        "expression" => PropertyValue::String(String::new()),
        "textTemplate" => PropertyValue::String(String::new()),
        _ => PropertyValue::String(String::new()),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedProperty {
    pub key: String,
    #[serde(rename = "type")]
    pub property_type: String,
    pub caption: String,
    pub description: Option<String>,
    pub required: bool,
    pub default_value: Option<String>,
    pub options: Vec<String>,
    pub category: String,
    #[serde(rename = "dataSource", skip_serializing_if = "Option::is_none")]
    pub data_source: Option<String>,
}

fn extract_properties_from_group_with_category(
    group: &WidgetPropertyGroup,
    category_path: &str,
) -> Vec<ParsedProperty> {
    let full_path = if category_path.is_empty() {
        group.caption.clone()
    } else if group.caption.is_empty() {
        category_path.to_string()
    } else {
        format!("{} > {}", category_path, group.caption)
    };

    let mut result: Vec<ParsedProperty> = group.properties.iter().map(|p| ParsedProperty {
        key: p.key.clone(),
        property_type: p.property_type.clone(),
        caption: p.caption.clone(),
        description: if p.description.is_empty() { None } else { Some(p.description.clone()) },
        required: p.required,
        default_value: p.default_value.clone(),
        options: p.options.clone(),
        category: if full_path.is_empty() { "General".to_string() } else { full_path.clone() },
        data_source: p.data_source.clone(),
    }).collect();

    // Recursively process nested groups
    for nested_group in &group.property_groups {
        result.extend(extract_properties_from_group_with_category(nested_group, &full_path));
    }

    result
}

fn parse_widget_properties_enhanced(definition: &WidgetDefinition) -> Vec<ParsedProperty> {
    let mut result: Vec<ParsedProperty> = Vec::new();

    // Root-level properties
    for p in &definition.properties {
        result.push(ParsedProperty {
            key: p.key.clone(),
            property_type: p.property_type.clone(),
            caption: p.caption.clone(),
            description: if p.description.is_empty() { None } else { Some(p.description.clone()) },
            required: p.required,
            default_value: p.default_value.clone(),
            options: p.options.clone(),
            category: "General".to_string(),
            data_source: p.data_source.clone(),
        });
    }

    // Properties from groups
    for group in &definition.property_groups {
        result.extend(extract_properties_from_group_with_category(group, ""));
    }

    result
}

#[tauri::command]
pub fn initialize_property_values(widget_path: String) -> Result<HashMap<String, PropertyValue>, String> {
    let definition = parse_widget_xml(&widget_path).map_err(|e| e.to_string())?;
    let properties = parse_widget_properties_enhanced(&definition);

    let mut values: HashMap<String, PropertyValue> = HashMap::new();

    for prop in properties {
        let value = if let Some(default) = prop.default_value {
            // Use default value based on type
            match prop.property_type.as_str() {
                "boolean" => PropertyValue::Boolean(default == "true"),
                "integer" => PropertyValue::Integer(default.parse().unwrap_or(0)),
                "decimal" => PropertyValue::Decimal(default.parse().unwrap_or(0.0)),
                _ => PropertyValue::String(default),
            }
        } else {
            get_default_value_for_type_internal(&prop.property_type)
        };

        values.insert(prop.key, value);
    }

    Ok(values)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupCountResult {
    pub group_path: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertySpec {
    pub key: String,
    #[serde(rename = "type")]
    pub property_type: String,
    pub caption: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub required: bool,
    #[serde(rename = "defaultValue", skip_serializing_if = "Option::is_none")]
    pub default_value: Option<String>,
    pub options: Vec<String>,
    #[serde(rename = "dataSource", skip_serializing_if = "Option::is_none")]
    pub data_source: Option<String>,
}

fn transform_widget_property_to_spec(prop: &WidgetProperty) -> PropertySpec {
    PropertySpec {
        key: prop.key.clone(),
        property_type: prop.property_type.clone(),
        caption: prop.caption.clone(),
        description: if prop.description.is_empty() {
            None
        } else {
            Some(prop.description.clone())
        },
        required: prop.required,
        default_value: prop.default_value.clone(),
        options: prop.options.clone(),
        data_source: prop.data_source.clone(),
    }
}

#[tauri::command]
pub fn transform_properties_to_spec(
    properties: Vec<WidgetProperty>,
) -> Result<Vec<PropertySpec>, String> {
    Ok(properties
        .iter()
        .map(transform_widget_property_to_spec)
        .collect())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyGroupSpec {
    pub caption: String,
    pub properties: Vec<PropertySpec>,
    #[serde(rename = "propertyGroups")]
    pub property_groups: Vec<PropertyGroupSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetDefinitionSpec {
    pub name: String,
    pub description: String,
    pub properties: Vec<PropertySpec>,
    #[serde(rename = "propertyGroups")]
    pub property_groups: Vec<PropertyGroupSpec>,
}

fn transform_property_group_to_spec(group: &WidgetPropertyGroup) -> PropertyGroupSpec {
    PropertyGroupSpec {
        caption: group.caption.clone(),
        properties: group
            .properties
            .iter()
            .map(transform_widget_property_to_spec)
            .collect(),
        property_groups: group
            .property_groups
            .iter()
            .map(transform_property_group_to_spec)
            .collect(),
    }
}

fn transform_widget_definition_to_spec(definition: &WidgetDefinition) -> WidgetDefinitionSpec {
    WidgetDefinitionSpec {
        name: definition.name.clone(),
        description: definition.description.clone(),
        properties: definition
            .properties
            .iter()
            .map(transform_widget_property_to_spec)
            .collect(),
        property_groups: definition
            .property_groups
            .iter()
            .map(transform_property_group_to_spec)
            .collect(),
    }
}

#[tauri::command]
pub fn parse_widget_properties_as_spec(widget_path: String) -> Result<WidgetDefinitionSpec, String> {
    let definition = parse_widget_xml(&widget_path).map_err(|e| e.to_string())?;
    Ok(transform_widget_definition_to_spec(&definition))
}

fn count_visible_properties_in_spec_group_internal(
    group: &PropertyGroupSpec,
    visible_keys: Option<&[String]>,
) -> usize {
    // Count properties in this group
    let direct_count = match visible_keys {
        Some(keys) => group
            .properties
            .iter()
            .filter(|p| keys.contains(&p.key))
            .count(),
        None => group.properties.len(),
    };

    // Recursively count properties in nested groups
    let nested_count: usize = group
        .property_groups
        .iter()
        .map(|nested| count_visible_properties_in_spec_group_internal(nested, visible_keys))
        .sum();

    direct_count + nested_count
}

fn count_all_spec_groups_recursive(
    group: &PropertyGroupSpec,
    parent_path: &str,
    visible_keys: Option<&[String]>,
    results: &mut Vec<GroupCountResult>,
) {
    let caption = &group.caption;
    let group_path = if parent_path.is_empty() {
        caption.clone()
    } else {
        format!("{}.{}", parent_path, caption)
    };

    // Count for this group
    let count = count_visible_properties_in_spec_group_internal(group, visible_keys);
    results.push(GroupCountResult {
        group_path: group_path.clone(),
        count,
    });

    // Recurse into nested groups
    for nested in &group.property_groups {
        count_all_spec_groups_recursive(nested, &group_path, visible_keys, results);
    }
}

#[tauri::command]
pub fn count_all_spec_groups_visible_properties(
    property_groups: Vec<PropertyGroupSpec>,
    visible_keys: Option<Vec<String>>,
) -> Result<Vec<GroupCountResult>, String> {
    let mut results = Vec::new();

    for group in &property_groups {
        count_all_spec_groups_recursive(group, "", visible_keys.as_deref(), &mut results);
    }

    Ok(results)
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

    #[test]
    fn test_parse_datasource_attribute() {
        let xml = r#"<?xml version="1.0" encoding="utf-8"?>
<widget id="com.example.MyWidget" needsEntityContext="true" xmlns="http://www.mendix.com/widget/1.0/">
    <name>My Widget</name>
    <description>Test widget with datasource</description>
    <properties>
        <property key="datasource" type="datasource" isList="true" required="false">
            <caption>Data Source</caption>
            <description>Data source for items</description>
        </property>
        <property key="idAttribute" type="attribute" dataSource="datasource" required="false">
            <caption>ID Attribute</caption>
            <description>Attribute for ID</description>
        </property>
    </properties>
</widget>"#;

        let result = parse_xml_content(xml).unwrap();

        assert_eq!(result.properties.len(), 2);

        let datasource_prop = &result.properties[0];
        assert_eq!(datasource_prop.key, "datasource");
        assert_eq!(datasource_prop.property_type, "datasource");
        assert!(datasource_prop.data_source.is_none());

        let attribute_prop = &result.properties[1];
        assert_eq!(attribute_prop.key, "idAttribute");
        assert_eq!(attribute_prop.property_type, "attribute");
        assert_eq!(attribute_prop.data_source, Some("datasource".to_string()));
    }

    fn create_test_property_spec(key: &str) -> PropertySpec {
        PropertySpec {
            key: key.to_string(),
            property_type: "string".to_string(),
            caption: format!("Caption for {}", key),
            description: None,
            default_value: None,
            required: false,
            options: vec![],
            data_source: None,
        }
    }

    fn create_test_property_group_spec(caption: &str, props: Vec<&str>, nested: Vec<PropertyGroupSpec>) -> PropertyGroupSpec {
        PropertyGroupSpec {
            caption: caption.to_string(),
            properties: props.into_iter().map(create_test_property_spec).collect(),
            property_groups: nested,
        }
    }

    #[test]
    fn test_count_visible_properties_no_filter() {
        let group = create_test_property_group_spec("General", vec!["prop1", "prop2", "prop3"], vec![]);
        let count = count_visible_properties_in_spec_group_internal(&group, None);
        assert_eq!(count, 3);
    }

    #[test]
    fn test_count_visible_properties_with_filter() {
        let group = create_test_property_group_spec("General", vec!["prop1", "prop2", "prop3"], vec![]);
        let visible = vec!["prop1".to_string(), "prop3".to_string()];
        let count = count_visible_properties_in_spec_group_internal(&group, Some(&visible));
        assert_eq!(count, 2);
    }

    #[test]
    fn test_count_visible_properties_nested() {
        let nested = create_test_property_group_spec("Nested", vec!["nested1", "nested2"], vec![]);
        let group = create_test_property_group_spec("Parent", vec!["prop1"], vec![nested]);

        let count = count_visible_properties_in_spec_group_internal(&group, None);
        assert_eq!(count, 3); // 1 from parent + 2 from nested
    }

    #[test]
    fn test_count_visible_properties_nested_with_filter() {
        let nested = create_test_property_group_spec("Nested", vec!["nested1", "nested2"], vec![]);
        let group = create_test_property_group_spec("Parent", vec!["prop1", "prop2"], vec![nested]);

        let visible = vec!["prop1".to_string(), "nested2".to_string()];
        let count = count_visible_properties_in_spec_group_internal(&group, Some(&visible));
        assert_eq!(count, 2); // prop1 + nested2
    }

    #[test]
    fn test_count_visible_properties_deeply_nested() {
        let deep = create_test_property_group_spec("Deep", vec!["deep1"], vec![]);
        let nested = create_test_property_group_spec("Nested", vec!["nested1"], vec![deep]);
        let group = create_test_property_group_spec("Parent", vec!["prop1"], vec![nested]);

        let count = count_visible_properties_in_spec_group_internal(&group, None);
        assert_eq!(count, 3); // 1 from each level
    }
}
