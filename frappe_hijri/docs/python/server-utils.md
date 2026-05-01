# Server Utilities

---

## `utils/date_utils.py`

Mirrors `frappe/utils/dateutils.py` for Gregorian dates.

### `validate_hijri_date(value, fieldname=None, label=None)`

Validates a stored Hijri date (`YYYY-MM-DD`) and throws `frappe.ValidationError` on failure.

Call from a DocType controller's `validate()` method to enforce integrity at the server boundary — necessary because the JS form control validates interactively but can be bypassed by Data Importer, REST API, or bench scripts.

```python
from frappe_hijri.utils.date_utils import validate_hijri_date

class MyDoc(Document):
    def validate(self):
        validate_hijri_date(
            self.birth_date_hijri,
            fieldname="birth_date_hijri",
            label=self.meta.get_field("birth_date_hijri").label,
        )
```

Checks in order: structural format (`YYYY-MM-DD`) → month range (1–12) → day within month length (Umm al-Qura when available, tabular fallback otherwise).

### `format_hijri_date(value, fmt=None)`

Converts a stored `YYYY-MM-DD` to the configured display format. When `fmt` is `None`, reads from Hijri Settings — the same source as `frappe.boot.hijri_date_format`.

Mirrors `frappe.utils.formatdate()` for Gregorian dates. Used internally by `utils/formatters.py`.

---

## `utils/formatters.py`

### `patch_format_value()`

Monkey-patches `frappe.utils.formatters.format_value` to handle `"Hijri Date"` fields. Mirrors the `"Date"` branch already present in `frappe/utils/formatters.py`.

Called once per process by `register_hijri_date_type_map()` in `__init__.py`. Idempotent via a module-level `_patched` sentinel.

**Surfaces covered:**

| Surface | Frappe entry point |
|---------|-------------------|
| Print formats | `frappe.get_print()` |
| Email templates | `frappe.sendmail()` |
| REST API responses | `/api/resource/` |
| Report column rendering | `frappe.query_report` |
| Data Export CSV | — |

Without this patch, all of these surfaces render the raw `YYYY-MM-DD` storage value instead of the display format configured in Hijri Settings.
