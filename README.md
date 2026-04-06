# Frappe Hijri

A Frappe app that adds the **Hijri (Islamic) Date** fieldtype to any Frappe v16+ site — with a full datepicker, configurable date format, Form Builder support, and server-side Umm al-Qura conversion.

Install once, and every app on the site can use `Hijri Date` as a first-class fieldtype.

---

## Installation

```bash
bench get-app https://github.com/YOUR_ORG/frappe_hijri --branch version-16
bench --site your-site install-app frappe_hijri
bench build --app frappe_hijri
bench restart
```

You can now use **"Hijri Date"** as a fieldtype in any DocType.

---

## Using in Your Custom App

### 1. Declare the dependency

Add `frappe_hijri` to your app's `hooks.py`:

```python
required_apps = ["frappe_hijri"]
```

### 2. Add Hijri Date fields

Select **"Hijri Date"** from the fieldtype dropdown in the DocType form or Form Builder. That's it — no additional configuration needed.

---

## Hijri Settings

Navigate to **Hijri Settings** (search bar → "Hijri Settings") to configure site-wide options.

| Setting | Options | Default |
|---------|---------|---------|
| Date Format | `yyyy-mm-dd`, `dd-mm-yyyy`, `dd/mm/yyyy`, `dd.mm.yyyy`, `mm/dd/yyyy`, `mm-dd-yyyy` | `yyyy-mm-dd` |

This works the same way as the **Date Format** setting in Frappe's System Settings:

- The chosen format controls how Hijri dates are **displayed** in form inputs and list views
- The **stored value** is always `YYYY-MM-DD` internally (e.g. `1447-10-07`)
- The format is delivered to the browser via `extend_bootinfo` (available as `frappe.boot.hijri_date_format`) — no extra API call needed
- Users can type dates in the configured format; the control parses them back to system format automatically

After changing the format, refresh the page to see it applied.

---

## What Frappe Hijri Provides

### Fieldtype: Hijri Date

| Feature | Detail |
|---------|--------|
| Storage | `VARCHAR(10)` column — Hijri date as `YYYY-MM-DD` (e.g. `1447-10-07`) |
| Display | Formatted per the Hijri Settings date format (e.g. `07-10-1447`) |
| Datepicker | Three-level navigation: Days → Months → Years |
| Month display | Arabic and English names side by side |
| Keyboard | `t` to select today's Hijri date; `Escape` to close |
| Overflow days | Previous/next month days shown and clickable (like Frappe's datepicker) |
| Form Builder | Hijri Date appears in the "Add Field" dialog and renders correctly |
| Theme | Uses Frappe CSS variables — adapts to light/dark themes automatically |

### Server-Side API

Three whitelisted endpoints using the `hijri-converter` library (Umm al-Qura calendar):

| Endpoint | Parameters | Returns |
|----------|------------|---------|
| `frappe_hijri.api.hijri.gregorian_to_hijri` | `date` (YYYY-MM-DD) | `{year, month, day, formatted, month_name, month_name_ar}` |
| `frappe_hijri.api.hijri.hijri_to_gregorian` | `date` (YYYY-MM-DD) **or** `year, month, day` | `{year, month, day, formatted, clamped}` |
| `frappe_hijri.api.hijri.get_hijri_month_length` | `year, month` | Integer (29 or 30) |

`clamped` is `true` when the requested day exceeded the actual month length and was adjusted.

**Examples:**

```javascript
// Gregorian → Hijri
frappe.call({
    method: "frappe_hijri.api.hijri.gregorian_to_hijri",
    args: { date: "2025-04-06" },
    callback: (r) => console.log(r.message)
    // → {year: 1446, month: 10, day: 8, formatted: "1446-10-08", ...}
});

// Hijri → Gregorian (pass date string directly — no manual splitting needed)
frappe.call({
    method: "frappe_hijri.api.hijri.hijri_to_gregorian",
    args: { date: frm.doc.my_hijri_field },
    callback: (r) => console.log(r.message.formatted)
    // → "2025-04-06"
});
```

### Client-Side API

The `frappe_hijri.hijri` namespace provides pure client-side conversion (Kuwaiti Algorithm — no server round-trip):

```javascript
// Conversion
let h = frappe_hijri.hijri.gregorianToHijri(2025, 4, 6);
// → {year: 1446, month: 10, day: 7}

let g = frappe_hijri.hijri.hijriToGregorian(1446, 10, 7);
// → {year: 2025, month: 4, day: 6}

// Month info
frappe_hijri.hijri.getMonthName(10);         // "شوال"
frappe_hijri.hijri.getMonthNameEn(10);       // "Shawwal"
frappe_hijri.hijri.hijriMonthDays(1446, 10); // 29 or 30

// Date formatting (respects Hijri Settings)
frappe_hijri.hijri.getDateFormat();              // "dd-mm-yyyy"
frappe_hijri.hijri.formatHijriDate("1446-10-07"); // "07-10-1446"
frappe_hijri.hijri.parseHijriDate("07-10-1446");  // "1446-10-07"
```

### Python Usage

```python
from hijri_converter import Hijri, Gregorian

# Gregorian → Hijri
h = Gregorian(2025, 4, 6).to_hijri()  # Hijri(1446, 10, 8)

# Hijri → Gregorian
g = Hijri(1446, 10, 8).to_gregorian()  # datetime.date(2025, 4, 6)

# Read from a document
doc = frappe.get_doc("My DocType", name)
hijri_date = doc.my_hijri_field  # "1446-10-07"
```

---

## How It Works

Frappe Hijri integrates at five layers to make `Hijri Date` a first-class fieldtype:

### 1. Python Fieldtype Registration (`__init__.py`)

Appends `"Hijri Date"` to `frappe.model.data_fieldtypes` at import time. Updates all known cached references in `frappe.model.meta`, `frappe.model.create_new`, and `permitted_documents_for_user`.

### 2. Type Map & DocField Meta (`before_request` / `before_migrate`)

- Adds `"Hijri Date" → ("varchar", 10)` to `frappe.db.type_map` so migrations create the correct column
- Patches the DocField meta to include `"Hijri Date"` in the fieldtype Select options (required because DocField is a "special doctype" that skips Property Setters)

### 3. JavaScript Control & Datepicker

`ControlHijriDate` extends `frappe.ui.form.ControlData` (not `ControlDate`) to avoid conflicts with Frappe's built-in air-datepicker. Supports configurable date format via `format_for_input()` / `parse()`.

### 4. Form Builder Integration

Intercepts the lazy assignment of `frappe.ui.FormBuilder` to register a `HijriDateControl` Vue component and pushes `"Hijri Date"` into `frappe.model.all_fieldtypes`.

### 5. Boot Info (`extend_bootinfo`)

Sends the configured `hijri_date_format` from Hijri Settings to the client via `frappe.boot.hijri_date_format`, following the same pattern Frappe uses for `sys_defaults.date_format`.

---

## Requirements

| Dependency | Version | Notes |
|------------|---------|-------|
| Frappe | v16+ | Framework |
| `hijri-converter` | >= 2.3.0 | Included in frappe_hijri's dependencies |

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Hijri Date" not in fieldtype dropdown | App not installed on the site | `bench --site your-site install-app frappe_hijri` |
| "Type cannot be Hijri Date" on save | `before_request` hook not firing | `bench restart` |
| Empty box in Form Builder | JS bundle not built | `bench build --app frappe_hijri` |
| "Add Field" doesn't list Hijri Date | Stale browser cache | Hard refresh (`Ctrl+Shift+R`) |
| Date format not changing | Boot cache stale | Refresh the page after saving Hijri Settings |
| Server error on day 30 of month 12 | Kuwaiti Algorithm vs Umm al-Qura mismatch | Day is auto-clamped server-side; check `clamped` flag |
| `ModuleNotFoundError: hijri_converter` | Dependency not installed | `pip install hijri-converter` or `bench setup requirements` |

---

## License

MIT
