# File Map

```
frappe_hijri/
├── __init__.py                              # Fieldtype registration, MariaDB patch
├── hooks.py                                 # All Frappe hooks
├── boot.py                                  # extend_bootinfo → frappe.boot.hijri_date_format
├── api/
│   └── hijri.py                             # 3 whitelisted conversion endpoints
├── utils/
│   ├── __init__.py
│   ├── date_utils.py                        # validate_hijri_date(), format_hijri_date()
│   └── formatters.py                        # patch_format_value() — monkey-patches frappe.utils.formatters
├── frappe_hijri/
│   └── doctype/
│       └── hijri_settings/
│           ├── hijri_settings.json          # Single DocType (1 Select field: date_format)
│           └── hijri_settings.py            # Controller (empty — no custom logic)
└── public/
    ├── css/
    │   └── hijri_datepicker.css             # Picker + range control styles
    └── js/
        ├── frappe_hijri.bundle.js           # esbuild entry point (7 imports, order-critical)
        ├── formatters.js                    # frappe.form.formatters.HijriDate (read-only display)
        ├── form_builder_patch.js            # Vue component + FormBuilder lazy-load interception
        ├── utils/
        │   └── hijri_utils.js              # frappe_hijri.hijri namespace (Kuwaiti Algorithm)
        ├── controls/
        │   ├── hijri_picker.js             # HijriPicker — shared calendar widget
        │   ├── hijri_date.js               # ControlHijriDate — form edit control
        │   └── hijri_date_range.js         # ControlHijriDateRange — filter "Between" control
        └── ui/
            └── filters/
                └── hijri_filter_patch.js   # frappe.ui.Filter monkey-patch
```

## Bundle Import Order

`frappe_hijri.bundle.js` imports in this exact order:

1. `utils/hijri_utils.js` — creates `frappe_hijri.hijri` namespace; everything depends on it
2. `controls/hijri_picker.js` — creates `frappe_hijri.HijriPicker`; depends on `hijri_utils`
3. `formatters.js` — registers read-only formatter; must run before any form renders
4. `controls/hijri_date.js` — depends on `HijriPicker`
5. `controls/hijri_date_range.js` — depends on `HijriPicker`
6. `form_builder_patch.js` — depends on `ControlHijriDate` being registered
7. `ui/filters/hijri_filter_patch.js` — depends on `ControlHijriDateRange` being registered
