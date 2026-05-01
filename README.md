<div align="center">
    <img src="./frappe_hijri/public/icons/desktop_icons/solid/hijri.svg" alt="Frappe Hijri Logo" height="80px" width="80px"/>
    <h2>Frappe Hijri</h2>
    <p>Islamic (Hijri) Date fieldtype for Frappe — with datepicker, filter support, and Umm al-Qura conversion</p>
</div>

---

## Frappe Hijri

A Frappe app that adds **Hijri (Islamic) Date** as a first-class fieldtype to any Frappe v16+ site.

Install once — every app on the site can use `"Hijri Date"` as a native fieldtype in any DocType, with a full datepicker, configurable display format, list-view filter integration (including "Between" range selection), Form Builder support, and server-side Umm al-Qura calendar conversion.

### Key Features

- **Custom Datepicker**: Three-level navigation (Days → Months → Years). Keyboard: `t` = today, `Esc` = close. Language-aware: shows Arabic month names when the user's language is Arabic, English abbreviations otherwise.
- **Filter Integration**: "Between" condition opens a range picker; all date operators (Before, After, On or Before, On or After, Timespan) work exactly as they do for the built-in Date fieldtype.
- **Umm al-Qura Server API**: Three whitelisted endpoints backed by the `hijri-converter` library for accurate Hijri ↔ Gregorian conversion.
- **Client-Side Conversion**: Pure JavaScript Kuwaiti Algorithm — instant conversion with no server round-trip.
- **Form Builder Support**: `"Hijri Date"` appears in the "Add Field" dialog and renders correctly on the Form Builder canvas.
- **Configurable Format**: Choose from six display formats in Hijri Settings. Stored value is always `YYYY-MM-DD` internally.
- **Theme Compatible**: Uses only Frappe CSS variables — adapts to light and dark themes automatically.

### Under the Hood

- [**Frappe Framework**](https://github.com/frappe/frappe): Frappe Hijri integrates at five layers — Python fieldtype registration, MariaDB type map, DocField meta patching, JavaScript control classes, and boot info delivery — making `"Hijri Date"` indistinguishable from a native Frappe fieldtype.

- [**hijri-converter**](https://github.com/dralshehri/hijri-converter): A Python library implementing the Umm al-Qura calendar used in Saudi Arabia. Used for all server-side Hijri ↔ Gregorian conversions.

---

## Installation

```bash
bench get-app https://github.com/YOUR_ORG/frappe_hijri --branch version-16
bench --site your-site install-app frappe_hijri
bench build --app frappe_hijri
bench restart
```

### Using in Your App

Add `frappe_hijri` to your app's `hooks.py`:

```python
required_apps = ["frappe_hijri"]
```

Then select **"Hijri Date"** from the fieldtype dropdown in any DocType — no additional configuration needed.

---

## Configuration

Navigate to **Hijri Settings** to configure the site-wide display format:

| Setting | Options | Default |
|---------|---------|---------|
| Date Format | `yyyy-mm-dd`, `dd-mm-yyyy`, `dd/mm/yyyy`, `dd.mm.yyyy`, `mm/dd/yyyy`, `mm-dd-yyyy` | `yyyy-mm-dd` |

The stored value is always `YYYY-MM-DD` (e.g. `1447-10-07`). The display format only affects how dates appear in inputs and list views. After changing the format, refresh the page.

---

## API

### Server Endpoints

| Method | Args | Returns |
|--------|------|---------|
| `frappe_hijri.api.hijri.gregorian_to_hijri` | `date` (YYYY-MM-DD) | `{year, month, day, formatted, month_name, month_name_ar}` |
| `frappe_hijri.api.hijri.hijri_to_gregorian` | `date` (YYYY-MM-DD) or `year, month, day` | `{year, month, day, formatted, clamped}` |
| `frappe_hijri.api.hijri.get_hijri_month_length` | `year, month` | `29` or `30` |

```javascript
frappe.call({
    method: "frappe_hijri.api.hijri.hijri_to_gregorian",
    args: { date: frm.doc.my_hijri_field },
    callback: (r) => console.log(r.message.formatted) // "2025-04-06"
});
```

### Client JavaScript

```javascript
// Conversion — no server call
frappe_hijri.hijri.gregorianToHijri(2025, 4, 6);   // {year:1446, month:10, day:7}
frappe_hijri.hijri.hijriToGregorian(1446, 10, 7);  // {year:2025, month:4, day:6}

// Formatting (respects Hijri Settings)
frappe_hijri.hijri.formatHijriDate("1446-10-07");  // "07-10-1446"
frappe_hijri.hijri.parseHijriDate("07-10-1446");   // "1446-10-07"

// Month info
frappe_hijri.hijri.getMonthName(10);               // "شوال"
frappe_hijri.hijri.getMonthNameEn(10);             // "Shawwal"
frappe_hijri.hijri.getMonthNameShort(10);          // "Shaw"
frappe_hijri.hijri.hijriMonthDays(1446, 10);       // 29
```

### Python

```python
from hijri_converter import Hijri, Gregorian

h = Gregorian(2025, 4, 6).to_hijri()   # Hijri(1446, 10, 8)
g = Hijri(1446, 10, 8).to_gregorian()  # datetime.date(2025, 4, 6)
```

---

## Documentation

Full architecture, algorithm notes, and detailed API reference are in [`frappe_hijri/docs/`](frappe_hijri/docs/index.md).

| Topic | File |
|-------|------|
| Architecture & layers | [docs/architecture.md](frappe_hijri/docs/architecture.md) |
| Conversion algorithms | [docs/algorithms.md](frappe_hijri/docs/algorithms.md) |
| Python registration | [docs/python/registration.md](frappe_hijri/docs/python/registration.md) |
| Server API | [docs/python/api.md](frappe_hijri/docs/python/api.md) |
| HijriPicker (JS) | [docs/javascript/picker.md](frappe_hijri/docs/javascript/picker.md) |
| Filter integration | [docs/javascript/filter.md](frappe_hijri/docs/javascript/filter.md) |
| CSS reference | [docs/css.md](frappe_hijri/docs/css.md) |

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
| `"Hijri Date"` not in fieldtype dropdown | `bench --site your-site install-app frappe_hijri` |
| Empty box in Form Builder | `bench build --app frappe_hijri` |
| Date format not applying | Refresh the page after saving Hijri Settings |
| `ModuleNotFoundError: hijri_converter` | `bench setup requirements` or `bench pip install hijri-converter` |

---

## License

MIT
