# JavaScript: Form Builder & Client Formatter

---

## Form Builder Patch

**File:** `public/js/form_builder_patch.js`

Frappe's Form Builder is a Vue 3 app loaded lazily. Without this patch, `"Hijri Date"` fields render as empty boxes in the builder canvas.

### `HijriDateControl` Vue Component

A read-only preview rendered inside the Form Builder's canvas. Shows the field label and a disabled `<input>` — matches the appearance of other built-in field type previews.

### `patchFormBuilder(FormBuilder)`

Wraps `FormBuilder.setup_app()` to register `HijriDateControl` as a Vue component before the app mounts.

Also pushes `"Hijri Date"` into `frappe.model.all_fieldtypes` so it appears in the "Add Field" autocomplete dialog.

### Lazy-Load Interception

`frappe.ui.FormBuilder` is `undefined` at bundle execution time. The patch uses `Object.defineProperty` to intercept its future assignment:

```javascript
Object.defineProperty(frappe.ui, "FormBuilder", {
    set(val) { formBuilderRef = val; if (val) patchFormBuilder(val); },
    get() { return formBuilderRef; },
});
```

When Frappe eventually assigns `frappe.ui.FormBuilder = ...`, the setter fires and `patchFormBuilder()` runs before any Form Builder UI is mounted.

---

## Client-Side Formatter

**File:** `public/js/formatters.js`

Registers `frappe.form.formatters.HijriDate` for read-only field rendering:

```javascript
frappe.form.formatters.HijriDate = function (value) {
    if (!value) return "";
    return frappe_hijri?.hijri?.formatHijriDate(value) ?? value;
};
```

**How Frappe resolves it:** `frappe.form.get_formatter(fieldtype)` strips spaces from the fieldtype name (`"Hijri Date"` → `"HijriDate"`) and looks up `frappe.form.formatters["HijriDate"]`.

**When it runs:** Any time a Hijri Date field is in "Read" display status — submitted documents, read-only fields, list views.

For server-rendered surfaces (print formats, email templates, REST API), the equivalent is `patch_format_value()` in `utils/formatters.py` — see [Server Utilities](../python/server-utils.md).
