use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ValueType {
    Boolean,
    Integer,
    Decimal,
    String,
}

#[tauri::command]
pub fn parse_value_by_type(raw_value: Value, value_type: ValueType) -> Value {
    match value_type {
        ValueType::Boolean => raw_value,
        ValueType::Integer => parse_integer_value(&raw_value),
        ValueType::Decimal => parse_decimal_value(&raw_value),
        ValueType::String => raw_value,
    }
}

#[tauri::command]
pub fn parse_integer_or_empty(value: String) -> Value {
    if value.is_empty() {
        Value::String(String::new())
    } else {
        match value.parse::<i64>() {
            Ok(n) => Value::Number(n.into()),
            Err(_) => Value::String(value),
        }
    }
}

#[tauri::command]
pub fn parse_decimal_or_empty(value: String) -> Value {
    if value.is_empty() {
        Value::String(String::new())
    } else {
        match value.parse::<f64>() {
            Ok(n) => serde_json::Number::from_f64(n)
                .map(Value::Number)
                .unwrap_or(Value::String(value)),
            Err(_) => Value::String(value),
        }
    }
}

fn parse_integer_value(value: &Value) -> Value {
    match value {
        Value::String(s) if s.is_empty() => Value::String(String::new()),
        Value::String(s) => match s.parse::<i64>() {
            Ok(n) => Value::Number(n.into()),
            Err(_) => value.clone(),
        },
        Value::Number(n) => Value::Number(n.clone()),
        _ => value.clone(),
    }
}

fn parse_decimal_value(value: &Value) -> Value {
    match value {
        Value::String(s) if s.is_empty() => Value::String(String::new()),
        Value::String(s) => match s.parse::<f64>() {
            Ok(n) => serde_json::Number::from_f64(n)
                .map(Value::Number)
                .unwrap_or_else(|| value.clone()),
            Err(_) => value.clone(),
        },
        Value::Number(n) => Value::Number(n.clone()),
        _ => value.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_parse_integer_or_empty_valid() {
        let result = parse_integer_or_empty("42".to_string());
        assert_eq!(result, json!(42));
    }

    #[test]
    fn test_parse_integer_or_empty_empty() {
        let result = parse_integer_or_empty("".to_string());
        assert_eq!(result, json!(""));
    }

    #[test]
    fn test_parse_integer_or_empty_invalid() {
        let result = parse_integer_or_empty("not a number".to_string());
        assert_eq!(result, json!("not a number"));
    }

    #[test]
    fn test_parse_decimal_or_empty_valid() {
        let result = parse_decimal_or_empty("3.14".to_string());
        assert_eq!(result, json!(3.14));
    }

    #[test]
    fn test_parse_decimal_or_empty_empty() {
        let result = parse_decimal_or_empty("".to_string());
        assert_eq!(result, json!(""));
    }

    #[test]
    fn test_parse_decimal_or_empty_invalid() {
        let result = parse_decimal_or_empty("not a number".to_string());
        assert_eq!(result, json!("not a number"));
    }

    #[test]
    fn test_parse_value_by_type_integer() {
        let result = parse_value_by_type(json!("42"), ValueType::Integer);
        assert_eq!(result, json!(42));
    }

    #[test]
    fn test_parse_value_by_type_decimal() {
        let result = parse_value_by_type(json!("3.14"), ValueType::Decimal);
        assert_eq!(result, json!(3.14));
    }

    #[test]
    fn test_parse_value_by_type_boolean() {
        let result = parse_value_by_type(json!(true), ValueType::Boolean);
        assert_eq!(result, json!(true));
    }

    #[test]
    fn test_parse_value_by_type_string() {
        let result = parse_value_by_type(json!("hello"), ValueType::String);
        assert_eq!(result, json!("hello"));
    }

    #[test]
    fn test_parse_integer_value_from_number() {
        let result = parse_value_by_type(json!(42), ValueType::Integer);
        assert_eq!(result, json!(42));
    }
}
