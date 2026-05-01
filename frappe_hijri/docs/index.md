# Frappe Hijri — Developer Docs

Technical reference for contributors and integrators. For installation and usage examples see the [README](../../README.md).

## Contents

- [Architecture](architecture.md) — Integration layers and execution timeline
- [File Map](file-map.md) — Complete source tree
- [Configuration](configuration.md) — Hijri Settings, date format pipeline

### Python

- [Fieldtype Registration](python/registration.md) — `__init__.py`: MariaDB patch, `data_fieldtypes`, DocField meta
- [Server API](python/api.md) — `api/hijri.py`: three conversion endpoints
- [Hooks](python/hooks.md) — `hooks.py`: all active hooks explained
- [Server Utilities](python/server-utils.md) — `utils/date_utils.py`, `utils/formatters.py`

### JavaScript

- [Conversion Utilities](javascript/utils.md) — `hijri_utils.js`: all public functions
- [Picker Widget](javascript/picker.md) — `HijriPicker`: shared calendar widget
- [Form Controls](javascript/controls.md) — `ControlHijriDate`, `ControlHijriDateRange`
- [Filter Integration](javascript/filter.md) — `hijri_filter_patch.js`
- [Form Builder & Formatters](javascript/form-builder.md) — `form_builder_patch.js`, `formatters.js`

### Reference

- [Conversion Algorithms](algorithms.md) — Kuwaiti, Umm al-Qura, Meeus Tabular, discrepancy handling
- [CSS Reference](css.md) — Picker and range control classes, Frappe CSS variables
