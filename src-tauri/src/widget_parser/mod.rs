use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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

// ============= Property UI Type Mapping =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UITypeMapping {
    pub property_type: String,
    pub ui_type: String,
}

fn map_property_type_to_ui_type_internal(property_type: &str) -> &'static str {
    match property_type {
        "string" => "text",
        "boolean" => "checkbox",
        "integer" => "number",
        "decimal" => "number",
        "enumeration" => "select",
        "expression" => "textarea",
        "textTemplate" => "textarea",
        "action" => "select",
        "attribute" => "select",
        "association" => "select",
        "object" => "select",
        "file" => "file",
        "datasource" => "select",
        "icon" => "icon",
        "image" => "image",
        "widgets" => "widgets",
        _ => "text",
    }
}

#[tauri::command]
pub fn map_property_type_to_ui_type(property_type: String) -> Result<String, String> {
    Ok(map_property_type_to_ui_type_internal(&property_type).to_string())
}

#[tauri::command]
pub fn get_ui_type_mappings() -> Result<Vec<UITypeMapping>, String> {
    let types = vec![
        "string", "boolean", "integer", "decimal", "enumeration", "expression",
        "textTemplate", "action", "attribute", "association", "object", "file",
        "datasource", "icon", "image", "widgets",
    ];

    Ok(types.iter().map(|t| UITypeMapping {
        property_type: t.to_string(),
        ui_type: map_property_type_to_ui_type_internal(t).to_string(),
    }).collect())
}

// ============= Property Default Values =============

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

#[tauri::command]
pub fn get_default_value_for_type(property_type: String) -> Result<PropertyValue, String> {
    Ok(get_default_value_for_type_internal(&property_type))
}

// ============= Property Validation =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyForValidation {
    pub property_type: String,
    pub required: bool,
    pub options: Option<Vec<String>>,
}

fn validate_property_value_internal(
    property: &PropertyForValidation,
    value: &str,
) -> ValidationResult {
    // Check if required field is empty
    if property.required && value.trim().is_empty() {
        return ValidationResult {
            is_valid: false,
            error: Some("This field is required".to_string()),
        };
    }

    // Type-specific validation
    match property.property_type.as_str() {
        "integer" => {
            if value.trim().is_empty() {
                return ValidationResult { is_valid: true, error: None };
            }
            match value.parse::<i64>() {
                Ok(_) => ValidationResult { is_valid: true, error: None },
                Err(_) => ValidationResult {
                    is_valid: false,
                    error: Some("Must be a valid integer".to_string()),
                },
            }
        }
        "decimal" => {
            if value.trim().is_empty() {
                return ValidationResult { is_valid: true, error: None };
            }
            match value.parse::<f64>() {
                Ok(_) => ValidationResult { is_valid: true, error: None },
                Err(_) => ValidationResult {
                    is_valid: false,
                    error: Some("Must be a valid decimal number".to_string()),
                },
            }
        }
        "enumeration" => {
            if value.trim().is_empty() {
                return ValidationResult { is_valid: true, error: None };
            }
            if let Some(ref options) = property.options {
                if options.contains(&value.to_string()) {
                    ValidationResult { is_valid: true, error: None }
                } else {
                    ValidationResult {
                        is_valid: false,
                        error: Some("Must be one of the available options".to_string()),
                    }
                }
            } else {
                ValidationResult { is_valid: true, error: None }
            }
        }
        _ => ValidationResult { is_valid: true, error: None },
    }
}

#[tauri::command]
pub fn validate_property_value(
    property: PropertyForValidation,
    value: String,
) -> Result<ValidationResult, String> {
    Ok(validate_property_value_internal(&property, &value))
}

// ============= Property Search Filtering =============

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
}

fn property_matches_search(property: &ParsedProperty, search_term: &str) -> bool {
    let search_lower = search_term.to_lowercase();

    property.caption.to_lowercase().contains(&search_lower)
        || property.key.to_lowercase().contains(&search_lower)
        || property.description
            .as_ref()
            .map(|d| d.to_lowercase().contains(&search_lower))
            .unwrap_or(false)
}

#[tauri::command]
pub fn filter_properties_by_search(
    properties: Vec<ParsedProperty>,
    search_term: String,
) -> Result<Vec<ParsedProperty>, String> {
    if search_term.trim().is_empty() {
        return Ok(properties);
    }

    Ok(properties
        .into_iter()
        .filter(|p| property_matches_search(p, &search_term))
        .collect())
}

// ============= Property Initialization =============

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
        });
    }

    // Properties from groups
    for group in &definition.property_groups {
        result.extend(extract_properties_from_group_with_category(group, ""));
    }

    result
}

#[tauri::command]
pub fn parse_widget_properties_to_parsed(widget_path: String) -> Result<Vec<ParsedProperty>, String> {
    let definition = parse_widget_xml(&widget_path).map_err(|e| e.to_string())?;
    Ok(parse_widget_properties_enhanced(&definition))
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

// ============= Group Properties by Category =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyGroup {
    pub category: String,
    pub properties: Vec<ParsedProperty>,
}

#[tauri::command]
pub fn group_properties_by_category(properties: Vec<ParsedProperty>) -> Result<Vec<PropertyGroup>, String> {
    let mut groups: HashMap<String, Vec<ParsedProperty>> = HashMap::new();

    for prop in properties {
        groups.entry(prop.category.clone()).or_default().push(prop);
    }

    let mut result: Vec<PropertyGroup> = groups.into_iter()
        .map(|(category, properties)| PropertyGroup { category, properties })
        .collect();

    // Sort groups: "General" first, then alphabetically
    result.sort_by(|a, b| {
        if a.category == "General" { std::cmp::Ordering::Less }
        else if b.category == "General" { std::cmp::Ordering::Greater }
        else { a.category.cmp(&b.category) }
    });

    Ok(result)
}

// ============= Editor Config Transformation Functions =============

/// Property format used by the editor config (frontend-friendly format)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorProperty {
    pub key: String,
    #[serde(rename = "type")]
    pub property_type: String,
    pub caption: String,
    pub description: Option<String>,
    #[serde(rename = "defaultValue")]
    pub default_value: Option<String>,
    pub required: bool,
    pub options: Vec<String>,
}

/// Property group format used by the editor config
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorPropertyGroup {
    pub caption: String,
    pub properties: Vec<EditorProperty>,
    #[serde(rename = "propertyGroups")]
    pub property_groups: Vec<EditorPropertyGroup>,
}

/// Transforms a WidgetProperty to EditorProperty format
fn transform_property_to_editor_format(prop: &WidgetProperty) -> EditorProperty {
    EditorProperty {
        key: prop.key.clone(),
        property_type: prop.property_type.clone(),
        caption: prop.caption.clone(),
        description: if prop.description.is_empty() {
            None
        } else {
            Some(prop.description.clone())
        },
        default_value: prop.default_value.clone(),
        required: prop.required,
        options: prop.options.clone(),
    }
}

/// Recursively transforms a WidgetPropertyGroup to EditorPropertyGroup format
fn transform_property_group_to_editor_format(group: &WidgetPropertyGroup) -> EditorPropertyGroup {
    EditorPropertyGroup {
        caption: group.caption.clone(),
        properties: group
            .properties
            .iter()
            .map(transform_property_to_editor_format)
            .collect(),
        property_groups: group
            .property_groups
            .iter()
            .map(transform_property_group_to_editor_format)
            .collect(),
    }
}

/// Transforms a WidgetDefinition to editor-friendly format (array of property groups)
fn transform_widget_definition_to_editor_format_internal(
    definition: &WidgetDefinition,
) -> Vec<EditorPropertyGroup> {
    definition
        .property_groups
        .iter()
        .map(transform_property_group_to_editor_format)
        .collect()
}

/// Recursively extracts all property keys from editor property groups
fn extract_keys_from_editor_group(group: &EditorPropertyGroup) -> Vec<String> {
    let mut keys: Vec<String> = group.properties.iter().map(|p| p.key.clone()).collect();

    for nested_group in &group.property_groups {
        keys.extend(extract_keys_from_editor_group(nested_group));
    }

    keys
}

/// Extracts all property keys from a list of editor property groups
fn extract_all_property_keys_from_groups_internal(groups: &[EditorPropertyGroup]) -> Vec<String> {
    let mut all_keys: Vec<String> = Vec::new();

    for group in groups {
        all_keys.extend(extract_keys_from_editor_group(group));
    }

    // Remove duplicates while preserving order
    let mut seen = std::collections::HashSet::new();
    all_keys.retain(|key| seen.insert(key.clone()));

    all_keys
}

/// Recursively checks if a property key exists in editor property groups
fn is_key_in_editor_group(group: &EditorPropertyGroup, key: &str) -> bool {
    if group.properties.iter().any(|p| p.key == key) {
        return true;
    }

    group
        .property_groups
        .iter()
        .any(|g| is_key_in_editor_group(g, key))
}

/// Checks if a property key exists in any of the editor property groups
fn is_property_key_in_groups_internal(groups: &[EditorPropertyGroup], key: &str) -> bool {
    groups.iter().any(|group| is_key_in_editor_group(group, key))
}

/// Filters parsed properties by visible keys
fn filter_parsed_properties_by_keys_internal(
    visible_keys: Option<&[String]>,
    parsed_properties: Vec<ParsedProperty>,
) -> Vec<ParsedProperty> {
    match visible_keys {
        None => parsed_properties,
        Some(keys) => parsed_properties
            .into_iter()
            .filter(|prop| keys.contains(&prop.key))
            .collect(),
    }
}

// ============= Editor Config Tauri Commands =============

#[tauri::command]
pub fn transform_widget_definition_to_editor_format(
    widget_path: String,
) -> Result<Vec<EditorPropertyGroup>, String> {
    let definition = parse_widget_xml(&widget_path).map_err(|e| e.to_string())?;
    Ok(transform_widget_definition_to_editor_format_internal(&definition))
}

#[tauri::command]
pub fn extract_all_property_keys_from_groups(
    groups: Vec<EditorPropertyGroup>,
) -> Result<Vec<String>, String> {
    Ok(extract_all_property_keys_from_groups_internal(&groups))
}

#[tauri::command]
pub fn filter_parsed_properties_by_keys(
    visible_keys: Option<Vec<String>>,
    parsed_properties: Vec<ParsedProperty>,
) -> Result<Vec<ParsedProperty>, String> {
    Ok(filter_parsed_properties_by_keys_internal(
        visible_keys.as_deref(),
        parsed_properties,
    ))
}

#[tauri::command]
pub fn is_property_key_in_groups(
    groups: Vec<EditorPropertyGroup>,
    property_key: String,
) -> Result<bool, String> {
    Ok(is_property_key_in_groups_internal(&groups, &property_key))
}

// ============= Property Count Functions =============

/// Recursively counts visible properties in an EditorPropertyGroup
fn count_visible_properties_in_group_internal(
    group: &EditorPropertyGroup,
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
        .map(|nested| count_visible_properties_in_group_internal(nested, visible_keys))
        .sum();

    direct_count + nested_count
}

#[tauri::command]
pub fn count_visible_properties_in_group(
    group: EditorPropertyGroup,
    visible_keys: Option<Vec<String>>,
) -> Result<usize, String> {
    Ok(count_visible_properties_in_group_internal(
        &group,
        visible_keys.as_deref(),
    ))
}

/// Counts visible properties in a WidgetPropertyGroup (original XML parsed format)
fn count_visible_properties_in_widget_group_internal(
    group: &WidgetPropertyGroup,
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
        .map(|nested| count_visible_properties_in_widget_group_internal(nested, visible_keys))
        .sum();

    direct_count + nested_count
}

#[tauri::command]
pub fn count_visible_properties_in_widget_group(
    group: WidgetPropertyGroup,
    visible_keys: Option<Vec<String>>,
) -> Result<usize, String> {
    Ok(count_visible_properties_in_widget_group_internal(
        &group,
        visible_keys.as_deref(),
    ))
}

// ============= Batch Property Count Functions =============

/// Result type for batch counting - maps group path to count
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupCountResult {
    pub group_path: String,
    pub count: usize,
}

/// Recursively counts all groups and builds a map of group_path -> count
fn count_all_groups_recursive(
    group: &EditorPropertyGroup,
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
    let count = count_visible_properties_in_group_internal(group, visible_keys);
    results.push(GroupCountResult {
        group_path: group_path.clone(),
        count,
    });

    // Recurse into nested groups
    for nested in &group.property_groups {
        count_all_groups_recursive(nested, &group_path, visible_keys, results);
    }
}

/// Counts visible properties for all groups in a widget definition
/// Returns a list of (group_path, count) pairs
fn count_all_groups_in_definition_internal(
    property_groups: &[EditorPropertyGroup],
    visible_keys: Option<&[String]>,
) -> Vec<GroupCountResult> {
    let mut results = Vec::new();

    for group in property_groups {
        count_all_groups_recursive(group, "", visible_keys, &mut results);
    }

    results
}

#[tauri::command]
pub fn count_all_groups_visible_properties(
    property_groups: Vec<EditorPropertyGroup>,
    visible_keys: Option<Vec<String>>,
) -> Result<Vec<GroupCountResult>, String> {
    Ok(count_all_groups_in_definition_internal(
        &property_groups,
        visible_keys.as_deref(),
    ))
}

// ============= Batch Property Count for WidgetPropertyGroup =============

/// Recursively counts all groups and builds a map of group_path -> count (for WidgetPropertyGroup)
fn count_all_widget_groups_recursive(
    group: &WidgetPropertyGroup,
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
    let count = count_visible_properties_in_widget_group_internal(group, visible_keys);
    results.push(GroupCountResult {
        group_path: group_path.clone(),
        count,
    });

    // Recurse into nested groups
    for nested in &group.property_groups {
        count_all_widget_groups_recursive(nested, &group_path, visible_keys, results);
    }
}

/// Counts visible properties for all groups in a widget definition (for WidgetPropertyGroup)
fn count_all_widget_groups_in_definition_internal(
    property_groups: &[WidgetPropertyGroup],
    visible_keys: Option<&[String]>,
) -> Vec<GroupCountResult> {
    let mut results = Vec::new();

    for group in property_groups {
        count_all_widget_groups_recursive(group, "", visible_keys, &mut results);
    }

    results
}

#[tauri::command]
pub fn count_all_widget_groups_visible_properties(
    property_groups: Vec<WidgetPropertyGroup>,
    visible_keys: Option<Vec<String>>,
) -> Result<Vec<GroupCountResult>, String> {
    Ok(count_all_widget_groups_in_definition_internal(
        &property_groups,
        visible_keys.as_deref(),
    ))
}

// ============= Property Spec Transformation =============

/// Property spec format expected by frontend components
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
}

/// Transforms a WidgetProperty to PropertySpec format
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
    }
}

/// Transforms a batch of WidgetProperty to PropertySpec format
#[tauri::command]
pub fn transform_properties_to_spec(
    properties: Vec<WidgetProperty>,
) -> Result<Vec<PropertySpec>, String> {
    Ok(properties
        .iter()
        .map(transform_widget_property_to_spec)
        .collect())
}

// ============= Complete Widget Definition in Spec Format =============

/// Property group in spec format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyGroupSpec {
    pub caption: String,
    pub properties: Vec<PropertySpec>,
    #[serde(rename = "propertyGroups")]
    pub property_groups: Vec<PropertyGroupSpec>,
}

/// Complete widget definition in spec format (frontend-ready)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetDefinitionSpec {
    pub name: String,
    pub description: String,
    pub properties: Vec<PropertySpec>,
    #[serde(rename = "propertyGroups")]
    pub property_groups: Vec<PropertyGroupSpec>,
}

/// Transforms a WidgetPropertyGroup to PropertyGroupSpec format
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

/// Transforms a WidgetDefinition to WidgetDefinitionSpec format
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

/// Parses widget properties and returns in spec format (frontend-ready)
#[tauri::command]
pub fn parse_widget_properties_as_spec(widget_path: String) -> Result<WidgetDefinitionSpec, String> {
    let definition = parse_widget_xml(&widget_path).map_err(|e| e.to_string())?;
    Ok(transform_widget_definition_to_spec(&definition))
}

// ============= Property Count Functions for Spec Format =============

/// Recursively counts visible properties in a PropertyGroupSpec
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

/// Recursively counts all groups and builds a map of group_path -> count (for PropertyGroupSpec)
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

/// Counts visible properties for all groups in spec format
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

    fn create_test_editor_property(key: &str) -> EditorProperty {
        EditorProperty {
            key: key.to_string(),
            property_type: "string".to_string(),
            caption: format!("Caption for {}", key),
            description: None,
            default_value: None,
            required: false,
            options: vec![],
        }
    }

    fn create_test_editor_group(caption: &str, props: Vec<&str>, nested: Vec<EditorPropertyGroup>) -> EditorPropertyGroup {
        EditorPropertyGroup {
            caption: caption.to_string(),
            properties: props.into_iter().map(create_test_editor_property).collect(),
            property_groups: nested,
        }
    }

    #[test]
    fn test_count_visible_properties_no_filter() {
        let group = create_test_editor_group("General", vec!["prop1", "prop2", "prop3"], vec![]);
        let count = count_visible_properties_in_group_internal(&group, None);
        assert_eq!(count, 3);
    }

    #[test]
    fn test_count_visible_properties_with_filter() {
        let group = create_test_editor_group("General", vec!["prop1", "prop2", "prop3"], vec![]);
        let visible = vec!["prop1".to_string(), "prop3".to_string()];
        let count = count_visible_properties_in_group_internal(&group, Some(&visible));
        assert_eq!(count, 2);
    }

    #[test]
    fn test_count_visible_properties_nested() {
        let nested = create_test_editor_group("Nested", vec!["nested1", "nested2"], vec![]);
        let group = create_test_editor_group("Parent", vec!["prop1"], vec![nested]);

        let count = count_visible_properties_in_group_internal(&group, None);
        assert_eq!(count, 3); // 1 from parent + 2 from nested
    }

    #[test]
    fn test_count_visible_properties_nested_with_filter() {
        let nested = create_test_editor_group("Nested", vec!["nested1", "nested2"], vec![]);
        let group = create_test_editor_group("Parent", vec!["prop1", "prop2"], vec![nested]);

        let visible = vec!["prop1".to_string(), "nested2".to_string()];
        let count = count_visible_properties_in_group_internal(&group, Some(&visible));
        assert_eq!(count, 2); // prop1 + nested2
    }

    #[test]
    fn test_count_visible_properties_deeply_nested() {
        let deep = create_test_editor_group("Deep", vec!["deep1"], vec![]);
        let nested = create_test_editor_group("Nested", vec!["nested1"], vec![deep]);
        let group = create_test_editor_group("Parent", vec!["prop1"], vec![nested]);

        let count = count_visible_properties_in_group_internal(&group, None);
        assert_eq!(count, 3); // 1 from each level
    }
}
