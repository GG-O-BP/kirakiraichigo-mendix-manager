use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ArrayOperation {
    #[serde(rename_all = "camelCase")]
    Add {
        property_key: String,
        default_item: Value,
    },
    #[serde(rename_all = "camelCase")]
    Remove {
        property_key: String,
        index: usize,
    },
    #[serde(rename_all = "camelCase")]
    Update {
        property_key: String,
        index: usize,
        nested_key: String,
        value: Value,
    },
}

fn add_array_item(properties: &mut Value, property_key: &str, default_item: Value) {
    if let Some(obj) = properties.as_object_mut() {
        let array = obj.entry(property_key).or_insert_with(|| Value::Array(vec![]));
        if let Some(arr) = array.as_array_mut() {
            arr.push(default_item);
        }
    }
}

fn remove_array_item(properties: &mut Value, property_key: &str, index: usize) {
    if let Some(obj) = properties.as_object_mut() {
        if let Some(array) = obj.get_mut(property_key) {
            if let Some(arr) = array.as_array_mut() {
                if index < arr.len() {
                    arr.remove(index);
                }
            }
        }
    }
}

fn update_array_item_property(
    properties: &mut Value,
    property_key: &str,
    index: usize,
    nested_key: &str,
    value: Value,
) {
    if let Some(obj) = properties.as_object_mut() {
        if let Some(array) = obj.get_mut(property_key) {
            if let Some(arr) = array.as_array_mut() {
                if let Some(item) = arr.get_mut(index) {
                    if let Some(item_obj) = item.as_object_mut() {
                        item_obj.insert(nested_key.to_string(), value);
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub fn manipulate_array_property(mut properties: Value, operation: ArrayOperation) -> Value {
    match operation {
        ArrayOperation::Add {
            property_key,
            default_item,
        } => {
            add_array_item(&mut properties, &property_key, default_item);
        }
        ArrayOperation::Remove {
            property_key,
            index,
        } => {
            remove_array_item(&mut properties, &property_key, index);
        }
        ArrayOperation::Update {
            property_key,
            index,
            nested_key,
            value,
        } => {
            update_array_item_property(&mut properties, &property_key, index, &nested_key, value);
        }
    }
    properties
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_add_array_item_to_empty() {
        let properties = json!({});
        let operation = ArrayOperation::Add {
            property_key: "items".to_string(),
            default_item: json!({"name": "new item"}),
        };

        let result = manipulate_array_property(properties, operation);
        assert_eq!(result["items"][0]["name"], "new item");
    }

    #[test]
    fn test_add_array_item_to_existing() {
        let properties = json!({
            "items": [{"name": "item1"}]
        });
        let operation = ArrayOperation::Add {
            property_key: "items".to_string(),
            default_item: json!({"name": "item2"}),
        };

        let result = manipulate_array_property(properties, operation);
        assert_eq!(result["items"].as_array().unwrap().len(), 2);
        assert_eq!(result["items"][1]["name"], "item2");
    }

    #[test]
    fn test_remove_array_item() {
        let properties = json!({
            "items": [{"name": "item1"}, {"name": "item2"}, {"name": "item3"}]
        });
        let operation = ArrayOperation::Remove {
            property_key: "items".to_string(),
            index: 1,
        };

        let result = manipulate_array_property(properties, operation);
        assert_eq!(result["items"].as_array().unwrap().len(), 2);
        assert_eq!(result["items"][0]["name"], "item1");
        assert_eq!(result["items"][1]["name"], "item3");
    }

    #[test]
    fn test_remove_array_item_out_of_bounds() {
        let properties = json!({
            "items": [{"name": "item1"}]
        });
        let operation = ArrayOperation::Remove {
            property_key: "items".to_string(),
            index: 10,
        };

        let result = manipulate_array_property(properties, operation);
        assert_eq!(result["items"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn test_update_array_item_property() {
        let properties = json!({
            "items": [{"name": "item1", "value": 1}, {"name": "item2", "value": 2}]
        });
        let operation = ArrayOperation::Update {
            property_key: "items".to_string(),
            index: 0,
            nested_key: "value".to_string(),
            value: json!(100),
        };

        let result = manipulate_array_property(properties, operation);
        assert_eq!(result["items"][0]["value"], 100);
        assert_eq!(result["items"][1]["value"], 2);
    }

    #[test]
    fn test_update_array_item_add_new_key() {
        let properties = json!({
            "items": [{"name": "item1"}]
        });
        let operation = ArrayOperation::Update {
            property_key: "items".to_string(),
            index: 0,
            nested_key: "newKey".to_string(),
            value: json!("new value"),
        };

        let result = manipulate_array_property(properties, operation);
        assert_eq!(result["items"][0]["newKey"], "new value");
    }
}
