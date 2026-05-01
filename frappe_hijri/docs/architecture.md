# Architecture

Frappe provides no public API for custom fieldtypes. `frappe_hijri` patches six internal layers:

| Layer | File | What it does |
|-------|------|--------------|
| MariaDB type map | `__init__.py` | `"Hijri Date" → ("varchar", 10)` — correct column type in migrations |
| `data_fieldtypes` | `__init__.py` | Registers `"Hijri Date"` as a data-bearing fieldtype |
| DocField meta | `__init__.py` | Injects `"Hijri Date"` into the fieldtype Select options at runtime |
| JS form controls | `controls/hijri_date.js`, `controls/hijri_date_range.js` | Edit control and filter range control |
| Filter system | `ui/filters/hijri_filter_patch.js` | Condition maps, default condition, fieldtype transform |
| Form Builder | `form_builder_patch.js` | Vue component + `all_fieldtypes` registration |
| Read-only display | `formatters.js` (JS), `utils/formatters.py` (Python) | Format stored `YYYY-MM-DD` for display |

---

## Execution Timeline

### `bench install-app <any-app>`

1. `before_app_install` hook calls `ensure_hijri_type_map_for_install()`
2. This imports `frappe_hijri.__init__`, which runs at load time:
   - `_patch_mariadb_class()` — wraps `MariaDBDatabase.setup_type_map` at class level
   - `_register_hijri_date_fieldtype()` — appends to `frappe.model.data_fieldtypes`
3. `sync_for()` runs — `frappe.db` already has the correct type map

### `bench migrate`

1. `before_migrate` hook calls `register_hijri_date_type_map()`
2. Patches current `frappe.db` instance and DocField meta

### Every HTTP request

1. `before_request` hook calls `register_hijri_date_type_map()`
2. Patches `frappe.db` (safety net for reconnects), `format_value`, and DocField meta

### Page load (browser)

1. `app_include_js` serves `frappe_hijri.bundle.*.js`
2. Bundle executes in order — see [File Map](file-map.md) for import sequence
3. `extend_bootinfo` has already written `frappe.boot.hijri_date_format` from Hijri Settings
