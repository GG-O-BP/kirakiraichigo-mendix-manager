import * as R from "ramda";
import DynamicPropertyInput from "../../common/DynamicPropertyInput";

export const renderPropertyInputField = R.curry(
  (properties, updateProperty, arrayHandlers, property) => (
    <DynamicPropertyInput
      key={R.prop("key", property)}
      property={property}
      value={R.prop(R.prop("key", property), properties)}
      onChange={updateProperty(R.prop("key", property))}
      disabled={false}
      showValidation={true}
      allProperties={properties}
      onAddArrayItem={R.prop("addArrayItem", arrayHandlers)}
      onRemoveArrayItem={R.prop("removeArrayItem", arrayHandlers)}
      onUpdateArrayItemProperty={R.prop("updateArrayItemProperty", arrayHandlers)}
    />
  )
);
