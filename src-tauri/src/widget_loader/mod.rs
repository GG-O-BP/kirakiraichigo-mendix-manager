use rc_zip_sync::*;
use serde::{Deserialize, Serialize};

use std::fs::File;
use std::io::Read;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetFile {
    pub path: String,
    pub content: String,
    pub is_text: bool,
    pub size: u64,
    pub extension: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPreviewData {
    pub component_name: Option<String>,
    pub component_type: Option<String>,
    pub props: Vec<String>,
    pub css_classes: Vec<String>,
    pub has_react: bool,
    pub has_dom_manipulation: bool,
    pub main_js_file: Option<String>,
    pub main_css_file: Option<String>,
    pub preview_html: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetContents {
    pub files: Vec<WidgetFile>,
    pub total_files: usize,
    pub web_files: Vec<WidgetFile>,
    pub manifest: Option<String>,
    pub preview_data: Option<WidgetPreviewData>,
}

/// Extract and read contents from a .mpk widget file
#[tauri::command]
pub async fn extract_widget_contents(widget_path: String) -> Result<WidgetContents, String> {
    println!("🍓 Extracting widget contents from: {}", widget_path);

    // Find the .mpk file in the dist/1.0.0 directory
    let widget_dir = Path::new(&widget_path);
    let dist_dir = widget_dir.join("dist").join("1.0.0");

    if !dist_dir.exists() {
        return Err(format!(
            "Widget dist directory not found: {}",
            dist_dir.display()
        ));
    }

    // Find the .mpk file
    let mpk_file = std::fs::read_dir(&dist_dir)
        .map_err(|e| format!("Failed to read dist directory: {}", e))?
        .filter_map(|entry| entry.ok())
        .find(|entry| {
            entry
                .path()
                .extension()
                .map(|ext| ext.to_string_lossy().to_lowercase() == "mpk")
                .unwrap_or(false)
        })
        .ok_or_else(|| "No .mpk file found in dist directory".to_string())?;

    let mpk_path = mpk_file.path();
    println!("✨ Found .mpk file: {}", mpk_path.display());

    // Open the .mpk file as a ZIP archive
    let file = File::open(&mpk_path).map_err(|e| format!("Failed to open .mpk file: {}", e))?;

    let archive = file
        .read_zip()
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;

    let mut files = Vec::new();
    let mut web_files = Vec::new();
    let mut manifest_content = None;

    println!(
        "📦 Processing {} entries in archive",
        archive.entries().count()
    );

    // Process each entry in the archive
    for entry in archive.entries() {
        let entry_name = entry.name.clone();
        let entry_size = entry.uncompressed_size;

        println!("📄 Processing entry: {} ({}bytes)", entry_name, entry_size);

        // Create a reader for this entry
        let mut reader = entry.reader();

        // Read the content
        let mut content = Vec::new();
        if let Err(e) = reader.read_to_end(&mut content) {
            println!("⚠️  Failed to read content for {}: {}", entry_name, e);
            continue; // Skip this entry instead of failing the entire operation
        }

        // Determine if this is a text file
        let is_text = is_text_file(&entry_name, &content);

        // Convert to string if it's a text file
        let content_string = if is_text {
            String::from_utf8_lossy(&content).to_string()
        } else {
            format!("[Binary file - {} bytes]", content.len())
        };

        // Extract file extension
        let extension = Path::new(&entry_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_lowercase())
            .unwrap_or_default();

        let widget_file = WidgetFile {
            path: entry_name.clone(),
            content: content_string.clone(),
            is_text,
            size: entry_size,
            extension: extension.clone(),
        };

        // Check if this is a web-related file
        if is_web_file(&entry_name) {
            web_files.push(widget_file.clone());
        }

        // Check if this is a manifest file (prioritize package.xml)
        if entry_name.to_lowercase() == "package.xml" {
            if is_text {
                manifest_content = Some(content_string.clone());
            }
        } else if manifest_content.is_none()
            && (entry_name.to_lowercase().contains("manifest")
                || entry_name.to_lowercase().ends_with(".xml"))
        {
            if is_text {
                manifest_content = Some(content_string.clone());
            }
        }

        files.push(widget_file);
    }

    println!(
        "🎉 Successfully extracted {} files ({} web files)",
        files.len(),
        web_files.len()
    );

    // Log and analyze web files
    for file in &web_files {
        println!("🌟 Web file found: {} ({}bytes)", file.path, file.size);

        // Perform detailed analysis of web file content
        analyze_web_file_content(file);
    }

    // Extract preview data for widget rendering
    let preview_data = extract_widget_preview_data(&web_files);

    Ok(WidgetContents {
        total_files: files.len(),
        web_files: web_files.clone(),
        files,
        manifest: manifest_content,
        preview_data: Some(preview_data),
    })
}

/// Check if a file is likely to be a text file based on its extension and content
fn is_text_file(filename: &str, content: &[u8]) -> bool {
    // Check by extension first
    let text_extensions = [
        "txt",
        "js",
        "jsx",
        "ts",
        "tsx",
        "css",
        "scss",
        "sass",
        "less",
        "html",
        "htm",
        "xml",
        "json",
        "md",
        "yml",
        "yaml",
        "toml",
        "svg",
        "csv",
        "log",
        "ini",
        "cfg",
        "conf",
        "properties",
    ];

    if let Some(ext) = Path::new(filename).extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        if text_extensions.contains(&ext_lower.as_str()) {
            return true;
        }
    }

    // Check content for UTF-8 validity and common text patterns
    if content.len() > 0 {
        // Try to decode as UTF-8
        if let Ok(text) = std::str::from_utf8(content) {
            // Check if it looks like text (not too many control characters)
            let control_chars = text
                .chars()
                .filter(|c| c.is_control() && *c != '\n' && *c != '\r' && *c != '\t')
                .count();

            return control_chars < text.len() / 20; // Less than 5% control characters
        }
    }

    false
}

/// Check if a file is web-related (JS, CSS, HTML, etc.)
fn is_web_file(filename: &str) -> bool {
    let web_extensions = [
        "js", "jsx", "ts", "tsx", "css", "scss", "sass", "less", "html", "htm", "svg", "json",
        "xml", "mjs", // Added .mjs for ES modules
    ];

    if let Some(ext) = Path::new(filename).extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        return web_extensions.contains(&ext_lower.as_str());
    }

    // Also check for common web file patterns
    let web_patterns = ["widget", "src", "lib", "dist", "build"];
    web_patterns
        .iter()
        .any(|pattern| filename.to_lowercase().contains(pattern))
}

/// Analyze web file content for component structure and rendering information
fn analyze_web_file_content(file: &WidgetFile) {
    if !file.is_text || file.content.is_empty() {
        return;
    }

    let filename = &file.path;
    let content = &file.content;

    println!("🔍 === ANALYZING WEB FILE: {} ===", filename);

    // Analyze JavaScript/TypeScript files
    if filename.ends_with(".js")
        || filename.ends_with(".mjs")
        || filename.ends_with(".jsx")
        || filename.ends_with(".ts")
        || filename.ends_with(".tsx")
    {
        println!("📱 JavaScript/TypeScript Analysis:");

        // Check for React components
        if content.contains("React") || content.contains("jsx") || content.contains("createElement")
        {
            println!("  ⚛️  React component detected");

            // Look for component exports
            if content.contains("export default") {
                println!("  📤 Has default export");
            }
            if content.contains("export") {
                println!("  📤 Has named exports");
            }

            // Look for hooks
            if content.contains("useState")
                || content.contains("useEffect")
                || content.contains("useContext")
            {
                println!("  🎣 React hooks detected");
            }
        }

        // Check for module system
        if content.contains("import ") {
            println!("  📦 ES6 imports detected");
        }
        if content.contains("require(") {
            println!("  📦 CommonJS requires detected");
        }

        // Look for widget-specific patterns
        if content.contains("mendix") || content.contains("Mendix") {
            println!("  🏗️  Mendix widget patterns detected");
        }

        // Check for DOM manipulation
        if content.contains("document.") || content.contains("window.") {
            println!("  🌐 DOM manipulation detected");
        }

        // Show function/class definitions (first few)
        let functions: Vec<&str> = content
            .lines()
            .filter(|line| {
                line.trim().starts_with("function ")
                    || line.trim().starts_with("const ") && line.contains("=>")
            })
            .take(5)
            .collect();

        if !functions.is_empty() {
            println!("  🔧 Functions/Components found:");
            for func in functions {
                println!("    - {}", func.trim());
            }
        }

        // Show a relevant code snippet (first non-empty, non-comment lines)
        let code_lines: Vec<&str> = content
            .lines()
            .filter(|line| {
                !line.trim().is_empty()
                    && !line.trim().starts_with("//")
                    && !line.trim().starts_with("/*")
            })
            .take(10)
            .collect();

        if !code_lines.is_empty() {
            println!("  📝 Code snippet (first 10 meaningful lines):");
            for (i, line) in code_lines.iter().enumerate() {
                println!("    {}: {}", i + 1, line.trim());
            }
        }
    }
    // Analyze CSS files
    else if filename.ends_with(".css")
        || filename.ends_with(".scss")
        || filename.ends_with(".sass")
        || filename.ends_with(".less")
    {
        println!("🎨 CSS Analysis:");

        // Count selectors and rules
        let selector_count = content.matches('{').count();
        println!("  📏 Approximately {} CSS rules", selector_count);

        // Look for common patterns
        if content.contains("@media") {
            println!("  📱 Media queries detected");
        }
        if content.contains("@keyframes") {
            println!("  🎬 Animations detected");
        }
        if content.contains("var(--") || content.contains("--") {
            println!("  🎯 CSS variables detected");
        }

        // Show main selectors (first few)
        let selectors: Vec<&str> = content
            .lines()
            .filter(|line| line.contains('{') && !line.trim().starts_with("/*"))
            .take(10)
            .collect();

        if !selectors.is_empty() {
            println!("  🎯 Main selectors:");
            for selector in selectors {
                println!("    - {}", selector.trim().replace("{", ""));
            }
        }
    }
    // Analyze XML files
    else if filename.ends_with(".xml") {
        println!("🏷️  XML Analysis:");

        // Look for widget configuration
        if content.contains("<widget") {
            println!("  🏗️  Widget configuration detected");
        }
        if content.contains("<properties") {
            println!("  ⚙️  Properties section detected");
        }

        // Show XML structure (first few meaningful lines)
        let xml_lines: Vec<&str> = content
            .lines()
            .filter(|line| !line.trim().is_empty() && (line.contains('<') || line.contains('>')))
            .take(15)
            .collect();

        if !xml_lines.is_empty() {
            println!("  📝 XML structure:");
            for line in xml_lines {
                println!("    {}", line.trim());
            }
        }
    }
    // Analyze HTML files
    else if filename.ends_with(".html") || filename.ends_with(".htm") {
        println!("🌐 HTML Analysis:");

        if content.contains("<script") {
            println!("  📜 Script tags detected");
        }
        if content.contains("<style") {
            println!("  🎨 Style tags detected");
        }

        // Show HTML structure
        let html_lines: Vec<&str> = content
            .lines()
            .filter(|line| !line.trim().is_empty())
            .take(20)
            .collect();

        if !html_lines.is_empty() {
            println!("  📝 HTML structure:");
            for line in html_lines {
                println!("    {}", line.trim());
            }
        }
    }
    // Analyze JSON files
    else if filename.ends_with(".json") {
        println!("📋 JSON Analysis:");

        // Try to parse and show structure
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(content) {
            println!("  ✅ Valid JSON structure");

            if let Some(obj) = parsed.as_object() {
                println!("  🔑 Keys found: {:?}", obj.keys().collect::<Vec<_>>());
            }
        } else {
            println!("  ❌ Invalid JSON format");
        }

        // Show content preview
        let preview_lines: Vec<&str> = content.lines().take(20).collect();
        if !preview_lines.is_empty() {
            println!("  📝 Content preview:");
            for line in preview_lines {
                println!("    {}", line.trim());
            }
        }
    }

    println!("🔍 === END ANALYSIS: {} ===\n", filename);
}

/// Extract widget preview data for rendering
fn extract_widget_preview_data(web_files: &Vec<WidgetFile>) -> WidgetPreviewData {
    println!("🎭 === EXTRACTING WIDGET PREVIEW DATA ===");

    let mut preview_data = WidgetPreviewData {
        component_name: None,
        component_type: None,
        props: Vec::new(),
        css_classes: Vec::new(),
        has_react: false,
        has_dom_manipulation: false,
        main_js_file: None,
        main_css_file: None,
        preview_html: None,
    };

    // Find main JS file (usually the largest JS file or one matching widget name)
    let mut main_js_file = None;
    let mut largest_js_size = 0;

    for file in web_files {
        if file.path.ends_with(".js") || file.path.ends_with(".mjs") {
            if file.size > largest_js_size {
                largest_js_size = file.size;
                main_js_file = Some(file.clone());
            }
        }
    }

    // Find main CSS file (usually the largest CSS file)
    let mut main_css_file = None;
    let mut largest_css_size = 0;

    for file in web_files {
        if file.path.ends_with(".css") {
            if file.size > largest_css_size {
                largest_css_size = file.size;
                main_css_file = Some(file.clone());
            }
        }
    }

    // Analyze main JS file
    if let Some(js_file) = &main_js_file {
        preview_data.main_js_file = Some(js_file.path.clone());
        analyze_js_for_preview(&js_file.content, &mut preview_data);
    }

    // Analyze main CSS file
    if let Some(css_file) = &main_css_file {
        preview_data.main_css_file = Some(css_file.path.clone());
        analyze_css_for_preview(&css_file.content, &mut preview_data);
    }

    // Generate preview HTML
    preview_data.preview_html = generate_preview_html(&preview_data);

    println!("🎭 Preview data extracted:");
    println!("  📦 Component: {:?}", preview_data.component_name);
    println!("  🎯 Type: {:?}", preview_data.component_type);
    println!("  ⚛️  React: {}", preview_data.has_react);
    println!("  🌐 DOM: {}", preview_data.has_dom_manipulation);
    println!("  📜 Main JS: {:?}", preview_data.main_js_file);
    println!("  🎨 Main CSS: {:?}", preview_data.main_css_file);
    println!("  📋 Props: {:?}", preview_data.props);
    println!("  🎯 CSS Classes: {:?}", preview_data.css_classes);
    println!("🎭 === END PREVIEW DATA EXTRACTION ===\n");

    preview_data
}

/// Analyze JavaScript file for preview data
fn analyze_js_for_preview(content: &str, preview_data: &mut WidgetPreviewData) {
    println!("📜 Analyzing JavaScript for preview data...");

    // Check for React
    if content.contains("React") || content.contains("jsx") || content.contains("createElement") {
        preview_data.has_react = true;
    }

    // Check for DOM manipulation
    if content.contains("document.")
        || content.contains("window.")
        || content.contains("querySelector")
    {
        preview_data.has_dom_manipulation = true;
    }

    // Extract component name from export statements
    if let Some(export_match) = extract_component_name_from_exports(content) {
        preview_data.component_name = Some(export_match);
    }

    // Determine component type
    if content.contains("class ") && content.contains("extends") {
        preview_data.component_type = Some("class".to_string());
    } else if content.contains("function ") || content.contains("=>") {
        preview_data.component_type = Some("function".to_string());
    }

    // Extract props from function parameters or propTypes
    extract_props_from_js(content, &mut preview_data.props);

    println!("📜 JS Analysis complete");
}

/// Extract component name from export statements
fn extract_component_name_from_exports(content: &str) -> Option<String> {
    // Look for export default ComponentName
    if let Some(line) = content
        .lines()
        .find(|line| line.trim().starts_with("export default"))
    {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            return Some(parts[2].trim_end_matches(';').to_string());
        }
    }

    // Look for export { ComponentName }
    if let Some(line) = content
        .lines()
        .find(|line| line.contains("export") && line.contains("{"))
    {
        if let Some(start) = line.find('{') {
            if let Some(end) = line.find('}') {
                let export_name = &line[start + 1..end].trim();
                return Some(export_name.to_string());
            }
        }
    }

    None
}

/// Extract props from JavaScript content
fn extract_props_from_js(content: &str, props: &mut Vec<String>) {
    // Look for function parameters destructuring
    for line in content.lines() {
        if line.contains("function") && line.contains("{") && line.contains("}") {
            if let Some(start) = line.find('{') {
                if let Some(end) = line.find('}') {
                    let params = &line[start + 1..end];
                    for param in params.split(',') {
                        let clean_param = param.trim().split(':').next().unwrap_or("").trim();
                        if !clean_param.is_empty() {
                            props.push(clean_param.to_string());
                        }
                    }
                }
            }
        }
    }

    // Look for propTypes definitions
    for line in content.lines() {
        if line.contains("propTypes") && line.contains(":") {
            if let Some(prop_name) = line.split(':').next() {
                let clean_name = prop_name.trim().replace("propTypes", "").trim().to_string();
                if !clean_name.is_empty() {
                    props.push(clean_name);
                }
            }
        }
    }
}

/// Analyze CSS file for preview data
fn analyze_css_for_preview(content: &str, preview_data: &mut WidgetPreviewData) {
    println!("🎨 Analyzing CSS for preview data...");

    // Extract CSS class names
    for line in content.lines() {
        if line.contains('{') && (line.starts_with('.') || line.contains('.')) {
            let class_part = line.split('{').next().unwrap_or("");
            for selector in class_part.split(',') {
                let selector = selector.trim();
                if selector.starts_with('.') {
                    let class_name = selector[1..].split_whitespace().next().unwrap_or("");
                    if !class_name.is_empty()
                        && !preview_data.css_classes.contains(&class_name.to_string())
                    {
                        preview_data.css_classes.push(class_name.to_string());
                    }
                }
            }
        }
    }

    // Limit to first 20 classes to avoid overwhelming output
    preview_data.css_classes.truncate(20);

    println!("🎨 CSS Analysis complete");
}

/// Generate preview HTML for the widget
fn generate_preview_html(preview_data: &WidgetPreviewData) -> Option<String> {
    println!("🏗️  Generating preview HTML...");

    let component_name = preview_data
        .component_name
        .as_ref()
        .map(|s| s.as_str())
        .unwrap_or("Widget");

    let main_class = preview_data
        .css_classes
        .first()
        .map(|s| s.as_str())
        .unwrap_or("widget-container");

    let props_attrs = preview_data
        .props
        .iter()
        .map(|prop| format!("data-{}", prop.to_lowercase()))
        .collect::<Vec<String>>()
        .join(" ");

    let preview_html = format!(
        r#"<div class="widget-preview-container">
  <div class="widget-preview-header">
    <h3>{}</h3>
    <span class="widget-type">{}</span>
  </div>
  <div class="widget-preview-body">
    <div class="{}" {}>
      <div class="widget-content">
        <p>🎭 Widget Preview</p>
        <p>This is a preview of the {} widget.</p>
        <div class="widget-props">
          {}
        </div>
      </div>
    </div>
  </div>
</div>"#,
        component_name,
        preview_data
            .component_type
            .as_ref()
            .unwrap_or(&"unknown".to_string()),
        main_class,
        props_attrs,
        component_name,
        preview_data
            .props
            .iter()
            .map(|prop| format!("<span class=\"prop-tag\">{}</span>", prop))
            .collect::<Vec<String>>()
            .join("\n          ")
    );

    println!("🏗️  Preview HTML generated");
    Some(preview_html)
}

/// Get widget preview data
#[tauri::command]
pub async fn get_widget_preview_data(widget_path: String) -> Result<WidgetPreviewData, String> {
    println!("🎭 Getting preview data for widget: {}", widget_path);

    let contents = extract_widget_contents(widget_path).await?;

    match contents.preview_data {
        Some(preview_data) => Ok(preview_data),
        None => Err("No preview data available".to_string()),
    }
}

/// Get specific file content from extracted widget
#[tauri::command]
pub async fn get_widget_file_content(
    widget_path: String,
    file_path: String,
) -> Result<String, String> {
    println!(
        "🔍 Getting file content: {} from {}",
        file_path, widget_path
    );

    // Extract all contents first
    let contents = extract_widget_contents(widget_path).await?;

    // Find the specific file
    let file = contents
        .files
        .iter()
        .find(|f| f.path == file_path)
        .ok_or_else(|| format!("File not found: {}", file_path))?;

    if !file.is_text {
        return Err("File is not a text file".to_string());
    }

    Ok(file.content.clone())
}

/// List all files in the widget
#[tauri::command]
pub async fn list_widget_files(widget_path: String) -> Result<Vec<String>, String> {
    println!("📋 Listing files in widget: {}", widget_path);

    let contents = extract_widget_contents(widget_path).await?;

    Ok(contents.files.iter().map(|f| f.path.clone()).collect())
}
