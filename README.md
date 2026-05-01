# Frappe Hijri

Adds **Hijri (Islamic) Date** as a first-class fieldtype to any Frappe v16+ site — with a custom datepicker, configurable display format, Form Builder support, list-view filter integration, and server-side Umm al-Qura conversion.

---

## Installation

```bash
bench get-app https://github.com/YOUR_ORG/frappe_hijri --branch version-16
bench --site your-site install-app frappe_hijri
bench build --app frappe_hijri
bench restart
```

To use in another app, declare the dependency in `hooks.py`:

```python
required_apps = ["frappe_hijri"]
```

---

## Configuration

Navigate to **Hijri Settings** to set the site-wide display format:

| Setting | Options | Default |
|---------|---------|---------|
| Date Format | `yyyy-mm-dd`, `dd-mm-yyyy`, `dd/mm/yyyy`, `dd.mm.yyyy`, `mm/dd/yyyy`, `mm-dd-yyyy` | `yyyy-mm-dd` |

The stored value is always `YYYY-MM-DD` (e.g. `1447-10-07`). The display format only affects how dates appear in inputs and list views.

---

## Features

| Feature | Detail |
|---------|--------|
| Fieldtype | `"Hijri Date"` — stored as `VARCHAR(10)` |
| Datepicker | Three-level navigation: Days → Months → Years. Keyboard: `t` = today, `Esc` = close |
| Filter support | "Between" opens a range picker; all date operators (Before, After, On or Before, On or After) work |
| Form Builder | Appears in the "Add Field" dialog and renders correctly on the canvas |
| Theme | Uses Frappe CSS variables — adapts to light/dark themes automatically |
| Server API | Three whitelisted endpoints via `hijri-converter` (Umm al-Qura calendar) |
| Client API | Pure JS conversion (Kuwaiti Algorithm) — no server round-trip needed |

---

## API

### Server (Python)

```python
# From another server-side script
from hijri_converter import Hijri, Gregorian

h = Gregorian(2025, 4, 6).to_hijri()   # Hijri(1446, 10, 8)
g = Hijri(1446, 10, 8).to_gregorian()  # datetime.date(2025, 4, 6)
```

Whitelisted endpoints:

| Method | Args | Returns |
|--------|------|---------|
| `frappe_hijri.api.hijri.gregorian_to_hijri` | `date` (YYYY-MM-DD) | `{year, month, day, formatted, month_name, month_name_ar}` |
| `frappe_hijri.api.hijri.hijri_to_gregorian` | `date` (YYYY-MM-DD) or `year, month, day` | `{year, month, day, formatted, clamped}` |
| `frappe_hijri.api.hijri.get_hijri_month_length` | `year, month` | `29` or `30` |

### Client (JavaScript)

```javascript
// Conversion (no server call)
frappe_hijri.hijri.gregorianToHijri(2025, 4, 6);   // {year:1446, month:10, day:7}
frappe_hijri.hijri.hijriToGregorian(1446, 10, 7);  // {year:2025, month:4, day:6}

// Formatting (respects Hijri Settings)
frappe_hijri.hijri.formatHijriDate("1446-10-07");  // "07-10-1446"
frappe_hijri.hijri.parseHijriDate("07-10-1446");   // "1446-10-07"

// Month info
frappe_hijri.hijri.getMonthName(10);               // "شوال"
frappe_hijri.hijri.getMonthNameEn(10);             // "Shawwal"
frappe_hijri.hijri.hijriMonthDays(1446, 10);       // 29
```

---

## Requirements

| Dependency | Version |
|------------|---------|
| Frappe | v16+ |
| `hijri-converter` | >= 2.3.0 |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Hijri Date" not in fieldtype dropdown | `bench --site your-site install-app frappe_hijri` |
| Empty box in Form Builder | `bench build --app frappe_hijri` |
| Date format not applying | Refresh the page after saving Hijri Settings |
| `ModuleNotFoundError: hijri_converter` | `bench setup requirements` or `bench pip install hijri-converter` |

---

For architecture details, algorithm notes, and full API reference see [`frappe_hijri/docs/`](frappe_hijri/docs/index.md).

## License

MIT
