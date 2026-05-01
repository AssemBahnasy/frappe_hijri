# Configuration

## Hijri Settings

**Type:** Single DocType — one global record per site.
**Access:** Search bar → "Hijri Settings" (System Manager only).

| Field | Type | Options | Default |
|-------|------|---------|---------|
| `date_format` | Select | `yyyy-mm-dd`, `dd-mm-yyyy`, `dd/mm/yyyy`, `dd.mm.yyyy`, `mm/dd/yyyy`, `mm-dd-yyyy` | `yyyy-mm-dd` |

After saving, refresh the page to apply the new format.

---

## Date Format Pipeline

```
Hijri Settings (DB)
    ↓
get_hijri_date_format()           frappe_hijri/__init__.py
    ↓
extend_bootinfo()                 frappe_hijri/boot.py
    ↓
frappe.boot.hijri_date_format     browser — available on every desk page load
    ↓
frappe_hijri.hijri.getDateFormat()    public/js/utils/hijri_utils.js
    ├── formatHijriDate(value)        YYYY-MM-DD → display format
    └── parseHijriDate(value)         display format → YYYY-MM-DD
```

This mirrors the path Frappe uses for `sys_defaults.date_format` in System Settings.

---

## Storage vs Display

| Layer | Format | Example |
|-------|--------|---------|
| Database column | `YYYY-MM-DD` | `1446-10-07` |
| `this.value` (JS control) | `YYYY-MM-DD` | `1446-10-07` |
| `<input>` visible text | Configured display format | `07-10-1446` |
| User typing | Configured display format | `07/10/1446` |
| API `formatted` response key | `YYYY-MM-DD` | `1446-10-07` |

Storage is always `YYYY-MM-DD` regardless of the display setting — identical to how Frappe stores Gregorian dates.
