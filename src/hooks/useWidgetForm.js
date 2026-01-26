import { useState, useCallback } from "react";

export function useWidgetForm() {
  const [newWidgetCaption, setNewWidgetCaption] = useState("");
  const [newWidgetPath, setNewWidgetPath] = useState("");

  const resetForm = useCallback(() => {
    setNewWidgetCaption("");
    setNewWidgetPath("");
  }, []);

  return {
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
    resetForm,
  };
}
