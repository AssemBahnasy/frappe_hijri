# Frappe Hijri — Technical Reference

This document describes the internal architecture, every file, every override, and every method exposed by the `frappe_hijri` app. It is intended for developers who want to understand how the Hijri Date fieldtype integrates with the Frappe framework.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Map](#2-file-map)
3. [Python: Fieldtype Registration (`__init__.py`)](#3-python-fieldtype-registration-__init__py)
4. [Python: Boot Info (`boot.py`)](#4-python-boot-info-bootpy)
5. [Python: Server API (`api/hijri.py`)](#5-python-server-api-apihijripy)
6. [Python: Hooks (`hooks.py`)](#6-python-hooks-hookspy)
7. [JavaScript: Conversion Library (`hijri_utils.js`)](#7-javascript-conversion-library-hijri_utilsjs)
8. [JavaScript: Datepicker Control (`hijri_date.js`)](#8-javascript-datepicker-control-hijri_datejs)
9. [JavaScript: Read-Only Formatter (`formatters.js`)](#9-javascript-read-only-formatter-formattersjs)
10. [JavaScript: Form Builder Patch (`form_builder_patch.js`)](#10-javascript-form-builder-patch-form_builder_patchjs)
11. [JavaScript: Bundle Entry Point (`frappe_hijri.bundle.js`)](#11-javascript-bundle-entry-point-frappe_hijribundlejs)
12. [CSS: Datepicker Styles (`hijri_datepicker.css`)](#12-css-datepicker-styles-hijri_datepickercss)
13. [DocType: Hijri Settings](#13-doctype-hijri-settings)
14. [Date Format Pipeline](#14-date-format-pipeline)
15. [Dependencies](#15-dependencies)
16. [Conversion Algorithms](#16-conversion-algorithms)

---

## 1. Architecture Overview

Frappe does not support custom fieldtypes via any public API. Adding `"Hijri Date"` requires patching five internal layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frappe Framework                         │
│                                                                 │
│  ┌──────────────────┐   ┌──────────────────┐   ┌────────────┐  │
│  │  data_fieldtypes  │   │  frappe.db.       │   │  DocField  │  │
│  │  (Python tuple)   │   │  type_map (dict)  │   │  meta opts │  │
│  └────────▲─────────┘   └────────▲─────────┘   └─────▲──────┘  │
│           │                      │                    │         │
│  ┌────────┴──────────────────────┴────────────────────┴──────┐  │
│  │              frappe_hijri/__init__.py                      │  │
│  │  _patch_mariadb_class()          ← class-level fix        │  │
│  │  _register_hijri_date_fieldtype()                         │  │
│  │  register_hijri_date_type_map()  ← instance safety net    │  │
│  │  _patch_docfield_fieldtype_options()                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────┐   ┌───────────────────┐                  │
│  │ frappe.ui.form.    │   │ frappe.ui.         │                  │
│  │ ControlHijriDate   │   │ FormBuilder patch  │                  │
│  │ (hijri_date.js)    │   │ (form_builder_     │                  │
│  │                    │   │  patch.js)         │                  │
│  └───────────────────┘   └───────────────────┘                  │
│                                                                 │
│  ┌───────────────────────────────────────────┐                  │
│  │ frappe.form.formatters.HijriDate           │                  │
│  │ (formatters.js) — read-only display        │                  │
│  └───────────────────────────────────────────┘                  │
│                                                                 │
│  ┌───────────────────┐   ┌───────────────────┐                  │
│  │ frappe_hijri.hijri │   │ frappe_hijri.api.  │                  │
│  │ (hijri_utils.js)   │   │ hijri (Python)     │                  │
│  │ Client-side conv.  │   │ Server-side conv.  │                  │
│  └───────────────────┘   └───────────────────┘                  │
│                                                                 │
│  ┌───────────────────┐   ┌───────────────────┐                  │
│  │ Hijri Settings     │   │ boot.py            │                  │
│  │ (Single DocType)   │──▶│ extend_bootinfo    │                  │
│  └───────────────────┘   └───────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### Execution Timeline

1. **`bench install-app <any-app>`** — `before_app_install` hook calls `ensure_hijri_type_map_for_install()`, which imports `frappe_hijri.__init__` and triggers steps below *before* `sync_for` runs. This is the critical entry point that was previously missing.
2. **Import time** (triggered by the above or any other import) — `__init__.py` runs:
   - `_patch_mariadb_class()` — wraps `MariaDBDatabase.setup_type_map` at the **class level** so every future database instance automatically includes `"Hijri Date" → ("varchar", 10)`. Idempotent via `_hijri_type_map_patched` sentinel.
   - Patches the current `frappe.db` instance if it already exists.
   - `_register_hijri_date_fieldtype()` — adds `"Hijri Date"` to `frappe.model.data_fieldtypes`.
3. **Every HTTP request** — `before_request` hook calls `register_hijri_date_type_map()`. Patches the current `frappe.db` instance (safety net) and DocField meta.
4. **Every migration** — `before_migrate` hook calls the same function so `bench migrate` creates `varchar(10)` columns.
5. **Page load (boot)** — `extend_bootinfo` sends `hijri_date_format` to the client.
6. **Desk render** — The JS bundle registers `ControlHijriDate`, patches FormBuilder, and exposes `frappe_hijri.hijri` utilities.

---

## 2. File Map

```
frappe_hijri/
├── __init__.py                          # Fieldtype registration + get_hijri_date_format()
├── hooks.py                             # app_include_js/css, before_app_install, before_request, before_migrate, extend_bootinfo
├── boot.py                              # Sends hijri_date_format to client via bootinfo
├── modules.txt                          # "Frappe Hijri"
├── patches.txt                          # (empty)
├── api/
│   ├── __init__.py
│   └── hijri.py                         # 3 whitelisted API endpoints
├── frappe_hijri/                         # Module folder
│   └── doctype/
│       └── hijri_settings/
│           ├── hijri_settings.json       # Single DocType definition
│           ├── hijri_settings.py         # Controller (empty)
│           └── hijri_settings.js         # Client script (empty)
└── public/
    ├── css/
    │   └── hijri_datepicker.css          # Datepicker styles (~192 lines)
    └── js/
        ├── frappe_hijri.bundle.js        # Entry point (4 imports)
        ├── formatters.js                 # frappe.form.formatters.HijriDate for read-only display
        ├── form_builder_patch.js         # Vue component + FormBuilder monkey-patch
        ├── controls/
        │   └── hijri_date.js             # ControlHijriDate class (~300 lines)
        └── utils/
            └── hijri_utils.js            # Kuwaiti Algorithm + format helpers (~210 lines)
```

---

## 3. Python: Fieldtype Registration (`__init__.py`)

**Location:** `frappe_hijri/__init__.py`

This file runs at import time and provides four internal functions, one public hook handler, and one public helper.

### `_patch_mariadb_class()` ← Primary Fix

Called at module load (bottom of file). Wraps `MariaDBDatabase.setup_type_map` at the **class level** so that `"Hijri Date" → ("varchar", 10)` is injected into every future database instance automatically.

**Why this is the root fix:** `Database.__init__()` calls `self.setup_type_map()` which assigns a **brand-new dict** to `self.type_map`. Any approach that patches an existing instance (including `before_migrate`, `before_request`, or utility helpers) is fragile:

| Scenario | `before_migrate` / instance patch | Class-level patch |
|---|---|---|
| `bench migrate` | ✅ works | ✅ works |
| `bench install-app` | ❌ `before_migrate` never fires | ✅ always works |
| DB reconnect mid-process | ❌ new instance loses the patch | ✅ always works |

**Implementation:**

```python
def _patch_mariadb_class():
    from frappe.database.mariadb.database import MariaDBDatabase

    if getattr(MariaDBDatabase, "_hijri_type_map_patched", False):
        return  # idempotency sentinel

    _original = MariaDBDatabase.setup_type_map

    def _patched_setup_type_map(self):
        _original(self)
        self.type_map["Hijri Date"] = ("varchar", 10)

    MariaDBDatabase.setup_type_map = _patched_setup_type_map
    MariaDBDatabase._hijri_type_map_patched = True
```

**Idempotent:** The `_hijri_type_map_patched` attribute on the class prevents double-wrapping if the module is somehow imported multiple times.

---

### `_register_hijri_date_fieldtype()`

Called at module load (bottom of file). Appends `"Hijri Date"` to `frappe.model.data_fieldtypes`.

**Why it patches multiple modules:** Several Frappe modules cache `data_fieldtypes` via `from frappe.model import data_fieldtypes`. This Python construct binds the *original* tuple to the module's local name. Replacing the tuple on `frappe.model` does not update these cached references. The function iterates known importers and updates them:

| Module | Why it caches `data_fieldtypes` |
|--------|---------------------------------|
| `frappe.model.meta` | `Meta.process()` validates field types against this tuple |
| `frappe.model.create_new` | `get_new_doc()` checks if a field is data-bearing |
| `frappe.core.report.permitted_documents_for_user` | Permission filtering by data fields |

**Idempotent:** Checks `"Hijri Date" in frappe.model.data_fieldtypes` first and returns early if already registered.

### `register_hijri_date_type_map()`

Called by `before_request` and `before_migrate` hooks. Acts as a **safety net** for the current process's `frappe.db` instance (which may have been constructed before `frappe_hijri` was imported). Performs three actions:

1. Calls `_register_hijri_date_fieldtype()` (idempotent)
2. Adds `"Hijri Date" → ("varchar", 10)` to `frappe.db.type_map` if not already present — covers the case where `frappe.db` was constructed before `_patch_mariadb_class()` ran
3. Calls `_patch_docfield_fieldtype_options()`

### `_patch_docfield_fieldtype_options()`

DocField is a "special doctype" in Frappe — `Meta.process()` skips `apply_property_setters()` for it. This means you cannot use Property Setters to add `"Hijri Date"` to the `fieldtype` field's Select options. The validation in `_validate_selects()` would reject saving any DocType that uses `"Hijri Date"` as a fieldtype.

**Solution:** Patches the **cached meta** object directly:

```python
meta = frappe.get_meta("DocField")
for field in meta.fields:
    if field.fieldname == "fieldtype":
        options = (field.options or "").split("\n")
        if "Hijri Date" not in options:
            options.append("Hijri Date")
            field.options = "\n".join(options)
        break
```

This runs on every request (via `before_request`) because Frappe may rebuild the meta cache at any time.

### `ensure_hijri_type_map_for_install(app_name)` ← Install Entry Point

Called by the `before_app_install` hook. Receives the name of the app being installed (e.g. `"regiment"`) but ignores it — its only job is to call `register_hijri_date_type_map()` before Frappe calls `sync_for()` for that app.

**Why this is necessary:** During `bench install-app`, Frappe **never fires `before_migrate`**. It reads hook names from `hooks.py` but does not import `frappe_hijri.__init__` — meaning `_patch_mariadb_class()` never runs. `before_app_install` is the only hook that:
- fires during `bench install-app` (not just `migrate`)
- is called with the real Python function (forcing the import)
- fires **before** `sync_for` creates database tables

```python
def ensure_hijri_type_map_for_install(app_name):
    register_hijri_date_type_map()
```

---

### `get_hijri_date_format()`

Public helper used by `boot.py`. Reads the `date_format` value from the `Hijri Settings` Single DocType.

```python
def get_hijri_date_format():
    try:
        fmt = frappe.db.get_single_value("Hijri Settings", "date_format")
    except Exception:
        fmt = None
    return fmt or "yyyy-mm-dd"
```

**Returns:** A string like `"dd-mm-yyyy"`, `"dd/mm/yyyy"`, etc. Defaults to `"yyyy-mm-dd"`.

---

## 4. Python: Boot Info (`boot.py`)

**Location:** `frappe_hijri/boot.py`

```python
def extend_bootinfo(bootinfo):
    bootinfo.hijri_date_format = get_hijri_date_format()
```

**Hook:** `extend_bootinfo` in `hooks.py`.

**Purpose:** Injects `hijri_date_format` into the boot response JSON sent to the browser on every full page load. This makes the format available as `frappe.boot.hijri_date_format` on the client without any extra API call.

**Pattern:** Identical to how Frappe delivers `frappe.boot.sysdefaults.date_format` from System Settings.

---

## 5. Python: Server API (`api/hijri.py`)

**Location:** `frappe_hijri/api/hijri.py`

**Library:** Uses `hijri-converter` (Umm al-Qura calendar — the official calendar of Saudi Arabia).

### `gregorian_to_hijri(date)`

| | |
|---|---|
| **Decorator** | `@frappe.whitelist()` |
| **Parameter** | `date` — Gregorian date string in `YYYY-MM-DD` format |
| **Returns** | `dict` with keys: `year`, `month`, `day`, `formatted`, `month_name`, `month_name_ar` |
| **Errors** | Throws `frappe.ValidationError` (title: "Invalid Gregorian Date") only for structurally invalid dates (e.g. month 13). Out-of-range dates (pre-~1925 CE) are handled by a tabular fallback — see [§16.2](#162-server-side-fallback-meeus-tabular-algorithm). |

**Algorithm selection:**

| Date range | Algorithm | Accuracy |
|---|---|---|
| ~1925 CE → present | `hijri-converter` (Umm al-Qura) | Exact (astronomical) |
| Any date ≥ 622 CE | Meeus Tabular (fallback) | ±1–2 days |

**Example call:**

```javascript
frappe.call({
    method: "frappe_hijri.api.hijri.gregorian_to_hijri",
    args: { date: "2025-04-06" },
    callback: (r) => {
        // r.message = {
        //   year: 1446, month: 10, day: 8,
        //   formatted: "1446-10-08",
        //   month_name: "Shawwal",
        //   month_name_ar: "شوال"
        // }
    }
});
```

**Example — historical date (pre-1925 CE):**

```javascript
frappe.call({
    method: "frappe_hijri.api.hijri.gregorian_to_hijri",
    args: { date: "1907-01-25" },
    callback: (r) => {
        // r.message = {
        //   year: 1324, month: 12, day: 10,
        //   formatted: "1324-12-10",
        //   month_name: "Dhu al-Hijjah",
        //   month_name_ar: "ذو الحجة"
        // }
    }
});
```

### `hijri_to_gregorian(year=None, month=None, day=None, date=None)`

| | |
|---|---|
| **Decorator** | `@frappe.whitelist()` |
| **Parameters** | Either `date` (Hijri `YYYY-MM-DD` string) **or** individual `year`, `month`, `day` integers |
| **Returns** | `dict` with keys: `year`, `month`, `day`, `formatted`, `clamped` |
| **Errors** | Throws with title "Missing Parameters" or "Invalid Hijri Date" |

**Day clamping:** If the requested day exceeds the actual month length in the Umm al-Qura calendar, it is silently clamped to the last day of that month, and `clamped: true` is returned. This handles the mismatch between the client-side Kuwaiti Algorithm and the server-side Umm al-Qura calendar.

**Example with `date` parameter (recommended):**

```javascript
frappe.call({
    method: "frappe_hijri.api.hijri.hijri_to_gregorian",
    args: { date: frm.doc.my_hijri_field },  // e.g. "1446-01-01"
    callback: (r) => {
        frm.set_value("gregorian_date", r.message.formatted);
        if (r.message.clamped) {
            frappe.show_alert({
                message: __("Day was adjusted to fit the Hijri month length"),
                indicator: "orange"
            });
        }
    }
});
```

### `get_hijri_month_length(year, month)`

| | |
|---|---|
| **Decorator** | `@frappe.whitelist()` |
| **Parameters** | `year`, `month` — Hijri year and month as integers |
| **Returns** | Integer — the number of days in that month (29 or 30) |
| **Errors** | Throws with title "Invalid Hijri Date" |

---

## 6. Python: Hooks (`hooks.py`)

**Location:** `frappe_hijri/hooks.py`

### Active Hooks

| Hook | Value | Purpose |
|------|-------|---------|
| `app_include_js` | `"frappe_hijri.bundle.js"` | Loads the compiled JS bundle on every desk page. Uses the short form so Frappe resolves it to the hashed dist file (e.g. `frappe_hijri.bundle.5VMD5CKU.js`) |
| `app_include_css` | `"/assets/frappe_hijri/css/hijri_datepicker.css"` | Loads datepicker styles. Uses full path since CSS is not bundled by esbuild || `before_app_install` | `["frappe_hijri.ensure_hijri_type_map_for_install"]` | **Primary install fix.** Fires before any app's `sync_for` during `bench install-app`, ensuring `"Hijri Date"` is in `type_map` before tables are created || `before_migrate` | `["frappe_hijri.register_hijri_date_type_map"]` | Ensures `type_map` and DocField meta are patched before `bench migrate` runs |
| `extend_bootinfo` | `"frappe_hijri.boot.extend_bootinfo"` | Sends `hijri_date_format` to the client |
| `before_request` | `["frappe_hijri.register_hijri_date_type_map"]` | Re-patches `type_map` and DocField meta on every HTTP request (since Frappe may rebuild the meta cache) |

### Why `app_include_js` uses the short form

Frappe's build system compiles `.bundle.js` files into `dist/` with content hashes. The `app_include_js` hook must reference the **short bundle name** (e.g. `frappe_hijri.bundle.js`), not the full source path. Frappe's asset resolver maps it to the correct hashed file at runtime.

Using the source path (`/assets/frappe_hijri/js/frappe_hijri.bundle.js`) would serve the raw 3-line import file (102 bytes) instead of the compiled bundle.

### Why `app_include_css` uses the full path

CSS files are not compiled by esbuild — they are served directly from `public/css/`. The full asset path is required.

---

## 7. JavaScript: Conversion Library (`hijri_utils.js`)

**Location:** `frappe_hijri/public/js/utils/hijri_utils.js`

**Namespace:** `window.frappe_hijri.hijri` (IIFE)

All functions are pure — no server calls, no side effects, no DOM access.

### Conversion Functions

#### `gregorianToHijri(gy, gm, gd)`

Converts a Gregorian date to Hijri using the Kuwaiti Algorithm.

| Parameter | Type | Description |
|-----------|------|-------------|
| `gy` | `number` | Gregorian year (e.g. 2025) |
| `gm` | `number` | Gregorian month (1–12) |
| `gd` | `number` | Gregorian day (1–31) |

**Returns:** `{ year, month, day }` — Hijri date components.

#### `hijriToGregorian(hy, hm, hd)`

Converts a Hijri date to Gregorian using the Kuwaiti Algorithm.

| Parameter | Type | Description |
|-----------|------|-------------|
| `hy` | `number` | Hijri year (e.g. 1446) |
| `hm` | `number` | Hijri month (1–12) |
| `hd` | `number` | Hijri day (1–30) |

**Returns:** `{ year, month, day }` — Gregorian date components.

### Formatting & Parsing Functions

#### `formatHijri(h)`

Formats a Hijri date object as a `YYYY-MM-DD` string (system format, not user format).

| Parameter | Type | Description |
|-----------|------|-------------|
| `h` | `{ year, month, day }` | Hijri date object |

**Returns:** `string` — e.g. `"1446-10-07"`

#### `parseDate(str)`

Parses a `YYYY-MM-DD` string into a `{ year, month, day }` object.

#### `getDateFormat()`

Returns the configured Hijri date format from `frappe.boot.hijri_date_format`. Falls back to `"yyyy-mm-dd"`.

**Returns:** `string` — e.g. `"dd-mm-yyyy"`, `"dd/mm/yyyy"`, `"mm/dd/yyyy"`, etc.

#### `formatHijriDate(value)`

Formats a system-format Hijri date string (`YYYY-MM-DD`) into the user display format.

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `string` | System format date, e.g. `"1446-10-07"` |

**Returns:** `string` — e.g. `"07-10-1446"` when format is `"dd-mm-yyyy"`, or `"07/10/1446"` when format is `"dd/mm/yyyy"`.

**Implementation:** Replaces `yyyy`, `mm`, `dd` tokens in the format string with zero-padded values.

#### `parseHijriDate(value)`

Parses a user-formatted Hijri date string back to system format (`YYYY-MM-DD`).

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `string` | User-formatted date, e.g. `"07-10-1446"` |

**Returns:** `string` — System format `"1446-10-07"`, or `""` if unparseable.

**Implementation:**
1. Reads the current format from `getDateFormat()`
2. Detects the separator character (e.g. `-`, `/`, `.`)
3. Splits both the format and value by the separator
4. Maps each format token (`yyyy`, `mm`, `dd`) to the corresponding value part
5. Reconstructs `YYYY-MM-DD`

### Calendar Functions

#### `hijriMonthDays(hy, hm)`

Returns the number of days in a Hijri month using the tabular Islamic calendar rules.

- Odd months (1, 3, 5, 7, 9, 11): 30 days
- Even months (2, 4, 6, 8, 10): 29 days
- Month 12: 30 days in leap years, 29 otherwise

#### `isHijriLeapYear(hy)`

Checks if a Hijri year is a leap year. Leap years occur at positions 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 in the 30-year cycle.

#### `getMonthName(month)`

Returns the Arabic name of a Hijri month.

| Month | Arabic | Month | Arabic |
|-------|--------|-------|--------|
| 1 | محرم | 7 | رجب |
| 2 | صفر | 8 | شعبان |
| 3 | ربيع الأول | 9 | رمضان |
| 4 | ربيع الثاني | 10 | شوال |
| 5 | جمادى الأولى | 11 | ذو القعدة |
| 6 | جمادى الآخرة | 12 | ذو الحجة |

#### `getMonthNameEn(month)`

Returns the English transliteration of a Hijri month name.

| Month | English | Month | English |
|-------|---------|-------|---------|
| 1 | Muharram | 7 | Rajab |
| 2 | Safar | 8 | Shaban |
| 3 | Rabi al-Awwal | 9 | Ramadan |
| 4 | Rabi al-Thani | 10 | Shawwal |
| 5 | Jumada al-Ula | 11 | Dhul Qadah |
| 6 | Jumada al-Akhirah | 12 | Dhul Hijjah |

---

## 8. JavaScript: Datepicker Control (`hijri_date.js`)

**Location:** `frappe_hijri/public/js/controls/hijri_date.js`

**Class:** `frappe.ui.form.ControlHijriDate extends frappe.ui.form.ControlData`

### Why `ControlData` and not `ControlDate`?

Frappe's `ControlDate` initializes `air-datepicker` (a Gregorian datepicker library). Extending it would cause conflicts — two datepickers fighting over the same input. By extending `ControlData`, we start with a clean text input and attach our own picker.

### Static Properties

| Property | Value | Purpose |
|----------|-------|---------|
| `trigger_change_on_input_event` | `false` | Prevents Frappe from calling `set_value()` on every keystroke. Value changes only happen via `_select()` or explicit `set_value()` |

### Lifecycle Methods

#### `make_input()`

Calls `super.make_input()` (creates the `<input>` element), then sets up the datepicker via `_setup_picker()`.

#### `_setup_picker()`

Binds three event handlers:

1. **`focus`** on `$input` → calls `_show()` to open the datepicker
2. **`keydown`** on `$input`:
   - `Escape` → closes the datepicker
   - `t` (no modifier keys) → selects today's Hijri date
3. **`mousedown`** on `document` → closes the datepicker if the click is outside both the input and the picker (outside-click handler)

#### `destroy()`

Cleans up the outside-click handler to prevent memory leaks.

### Datepicker Rendering

The datepicker is rendered as raw HTML inside a `<div class="hijri-dp">` appended to the control's `input_area`. Three views are supported:

#### `_renderDays()`

Renders the day grid for the current month.

1. Calculates the number of days in the month via `hijriMonthDays()`
2. Converts the 1st of the month to Gregorian to determine the day-of-week
3. Renders **overflow days** from the previous month (faded, clickable)
4. Renders current month days with `-sel-` (selected) and `-cur-` (today) CSS classes
5. Renders **overflow days** from the next month to fill the remaining grid cells
6. Header shows Arabic + English month name and year

**Navigation:** `←`/`→` buttons change month. Clicking the header title switches to month view.

#### `_renderMonths()`

Renders a 3×4 grid of months (1–12). Each cell shows the Arabic name and English transliteration.

**Navigation:** `←`/`→` buttons change year. Clicking the header switches to year view.

#### `_renderYears()`

Renders a 4×3 grid of years for the current decade. Includes one year before and after the decade range (shown faded).

**Navigation:** `←`/`→` buttons shift by 10 years. Header is the top level — no further zoom out.

### Helper Methods

#### `_today()`

Returns today's date as a Hijri `{ year, month, day }` object using client-side `gregorianToHijri()`.

#### `_nav(title)`

Returns the HTML for the navigation bar (← title →).

#### `_footer()`

Returns the HTML for the "Today" button at the bottom of the picker.

#### `_bindNav(prev, next, title)`

Binds click handlers for the nav buttons and the "Today" link.

### Value Handling

#### `_select(hy, hm, hd)`

Called when the user clicks a day. Formats the date as `YYYY-MM-DD` (system format), stores it via `this.set_value(s)`, and hides the picker.

#### `get_value()`

Returns `this.value` (system format `YYYY-MM-DD`) or `""`.

#### `format_for_input(value)`

Converts a system-format value to the user's display format using `frappe_hijri.hijri.formatHijriDate()`.

**Example:** `"1446-10-07"` → `"07-10-1446"` (when format is `dd-mm-yyyy`).

#### `set_formatted_input(value)`

Sets the `<input>` element's visible value using `format_for_input()`.

#### `parse(value)`

Converts user input back to system format. Tries two strategies in order:

1. **System-format detection:** Splits by `-` and checks if the first segment is > 31. Since Hijri years are always > 1000 and days are always ≤ 30, a first segment > 31 unambiguously identifies a `YYYY-MM-DD` system-format value. This is critical because Frappe's `get_status()` calls `parse()` on the raw DB value during read-only rendering — without this check, `parseHijriDate()` would misinterpret the year as a day when the user format is e.g. `dd-mm-yyyy`, producing an invalid date that causes the field to be hidden.
2. **User-format parsing:** Calls `frappe_hijri.hijri.parseHijriDate(value)` to parse using the configured display format.

After parsing, validates that month is 1–12 and day doesn't exceed the month length.

**Returns:** System format string or `""` if invalid.

#### `validate(value)`

Called by Frappe's form engine after `parse()`. Performs the same month/day range checks and shows a `frappe.msgprint()` error if invalid, including the expected format from `getDateFormat()`.

---

## 9. JavaScript: Read-Only Formatter (`formatters.js`)

**Location:** `frappe_hijri/public/js/formatters.js`

Registers `frappe.form.formatters.HijriDate` so that Frappe's `set_disp_area()` can render Hijri dates in the user's configured format when the field is read-only (e.g. on submitted documents).

```javascript
frappe.form.formatters.HijriDate = function (value) {
    if (!value) return "";
    if (frappe_hijri?.hijri?.formatHijriDate) {
        return frappe_hijri.hijri.formatHijriDate(value);
    }
    return value;
};
```

**How Frappe resolves it:** `frappe.form.get_formatter(fieldtype)` strips spaces from the fieldtype name (`"Hijri Date"` → `"HijriDate"`) and looks up `frappe.form.formatters.HijriDate`.

**When it runs:** Whenever a Hijri Date field is in "Read" display status — submitted documents, read-only fields, list views, and print formats.

---

## 10. JavaScript: Form Builder Patch (`form_builder_patch.js`)

**Location:** `frappe_hijri/public/js/form_builder_patch.js`

**Purpose:** Frappe's Form Builder is a Vue 3 app loaded lazily. Its component registry doesn't know about custom fieldtypes — rendering them as empty boxes. This file solves the problem without modifying Frappe core.

### `HijriDateControl` Vue Component

A read-only preview component registered in the Form Builder's Vue app:

```javascript
const HijriDateControl = {
    props: ["df", "value", "read_only"],
    template: `
        <div class="control frappe-control" :class="{ editable: $slots.label }">
            <div v-if="$slots.label" class="field-controls">
                <slot name="label" />
                <slot name="actions" />
            </div>
            <div v-else class="control-label label" :class="{ reqd: df.reqd }">
                {{ __(df.label) }}
            </div>
            <input class="form-control" type="text" :value="value"
                :disabled="read_only || df.read_only" readonly />
            <div v-if="df.description" class="mt-2 description"
                v-html="__(df.description)" />
        </div>
    `,
};
```

### `patchFormBuilder(FormBuilder)`

Wraps the FormBuilder's `setup_app()` method to register `HijriDateControl` as a Vue component before the app mounts.

### Lazy Loading Interception

FormBuilder is loaded lazily — `frappe.ui.FormBuilder` is `undefined` at bundle execution time. The patch uses `Object.defineProperty` to intercept the setter:

```javascript
Object.defineProperty(frappe.ui, "FormBuilder", {
    set(val) {
        _FormBuilder = val;
        if (val) patchFormBuilder(val);
    },
    get() { return _FormBuilder; },
});
```

When Frappe eventually assigns `frappe.ui.FormBuilder = ...`, the setter fires and `patchFormBuilder()` runs.

### `frappe.model.all_fieldtypes`

Also pushes `"Hijri Date"` into `frappe.model.all_fieldtypes` so it appears in the Form Builder's "Add Field" autocomplete dialog.

---

## 11. JavaScript: Bundle Entry Point (`frappe_hijri.bundle.js`)

**Location:** `frappe_hijri/public/js/frappe_hijri.bundle.js`

```javascript
import "./utils/hijri_utils.js";
import "./formatters.js";
import "./controls/hijri_date.js";
import "./form_builder_patch.js";
```

**Import order matters:**

1. `hijri_utils.js` — must load first to create `frappe_hijri.hijri` namespace
2. `formatters.js` — depends on `frappe_hijri.hijri.formatHijriDate()` for formatting; must register `frappe.form.formatters.HijriDate` before any form renders
3. `hijri_date.js` — depends on `frappe_hijri.hijri` for conversions
4. `form_builder_patch.js` — depends on the control being registered

esbuild compiles this into a single hashed file in `dist/js/` (e.g. `frappe_hijri.bundle.JYGZTZRF.js`, ~11 KB).

---

## 12. CSS: Datepicker Styles (`hijri_datepicker.css`)

**Location:** `frappe_hijri/public/css/hijri_datepicker.css`

~192 lines of CSS that visually matches Frappe's native air-datepicker. Uses Frappe CSS variables exclusively for full light/dark theme compatibility.

### Key Classes

| Class | Element | Notes |
|-------|---------|-------|
| `.hijri-dp` | Container | Absolute positioned, z-index 9999, 280px wide, border-radius, box-shadow |
| `.hijri-dp-nav` | Navigation bar | Flex layout, prev/next buttons + clickable title |
| `.hijri-dp-nav-btn` | Nav arrow buttons | 32×32px, hover highlight |
| `.hijri-dp-nav-title` | Month/year header | Clickable to zoom out |
| `.hijri-dp-days-names` | Day name row | 7-column grid, uppercase, semibold, muted color |
| `.hijri-dp-cells` | Cell grid container | CSS grid with padding |
| `.hijri-dp-cells-days` | Day grid | 7 columns |
| `.hijri-dp-cells-months` | Month grid | 3 columns |
| `.hijri-dp-cells-years` | Year grid | 4 columns |
| `.hijri-dp-day` | Day cell | 36×36px, centered |
| `.hijri-dp-month` | Month cell | Column flex, Arabic name + English name |
| `.hijri-dp-year` | Year cell | Padded |
| `.-sel-` | Selected state | Primary background, white text, bold |
| `.-cur-` | Current day/month/year | Bold, primary color text |
| `.-other-` | Overflow/adjacent items | Muted color, 50% opacity |
| `.hijri-dp-footer` | Footer | Top border, contains "Today" link |
| `.hijri-dp-today` | Today button | Block display, full width hover, centered text |
| `.hijri-dp-mar` | Arabic month name | Semibold, small text |
| `.hijri-dp-men` | English month name | Extra small, muted (white when selected) |

### CSS Variables Used

All styling references Frappe's CSS custom properties:

- `--fg-color`, `--fg-hover-color` — backgrounds
- `--text-color`, `--text-muted` — text colors
- `--border-color` — borders
- `--primary` — accent/selection color
- `--border-radius`, `--border-radius-sm`, `--border-radius-lg` — corners
- `--shadow-2xl` — dropdown shadow
- `--text-sm`, `--text-xs` — font sizes
- `--weight-semibold`, `--weight-bold`, `--weight-medium` — font weights

---

## 13. DocType: Hijri Settings

**Location:** `frappe_hijri/frappe_hijri/doctype/hijri_settings/`

**Type:** Single DocType (`issingle: 1`) — one global record per site.

**Permissions:** System Manager only (create, read, write, delete).

### Fields

| Fieldname | Fieldtype | Label | Options | Required |
|-----------|-----------|-------|---------|----------|
| `date_defaults_section` | Section Break | Date Defaults | — | — |
| `date_format` | Select | Date Format | `yyyy-mm-dd`, `dd-mm-yyyy`, `dd/mm/yyyy`, `dd.mm.yyyy`, `mm/dd/yyyy`, `mm-dd-yyyy` | Yes |
| `column_break_cchy` | Column Break | — | — | — |

### Controller

```python
class HijriSettings(Document):
    pass
```

No custom validation or processing — the value is read by `get_hijri_date_format()` in `__init__.py`.

---

## 14. Date Format Pipeline

The date format flows through the system following the same pattern as Frappe's System Settings `date_format`:

```
Hijri Settings (DB)
    │
    ▼
get_hijri_date_format()    ← __init__.py
    │
    ▼
extend_bootinfo()          ← boot.py
    │
    ▼
frappe.boot.hijri_date_format   ← Client JS (available after page load)
    │
    ▼
getDateFormat()            ← hijri_utils.js (reads from frappe.boot)
    │
    ├──▶ formatHijriDate()   ← System "YYYY-MM-DD" → Display "DD-MM-YYYY"
    │
    └──▶ parseHijriDate()    ← Display "DD-MM-YYYY" → System "YYYY-MM-DD"
           │
           ▼
    ControlHijriDate
    ├── format_for_input()   → calls formatHijriDate()
    ├── set_formatted_input() → calls format_for_input()
    ├── parse()              → detects system format first, then calls parseHijriDate()
    └── validate()           → shows getDateFormat() in error messages

    frappe.form.formatters.HijriDate   ← formatters.js
    └── set_disp_area()      → calls formatHijriDate() for read-only rendering
```

### Storage vs Display

| Layer | Format | Example | Notes |
|-------|--------|---------|-------|
| Database | `YYYY-MM-DD` | `1446-10-07` | Always stored in system format |
| `this.value` | `YYYY-MM-DD` | `1446-10-07` | Internal JS value |
| `<input>` display | User format | `07-10-1446` | Via `format_for_input()` |
| User typing | User format | `07/10/1446` | Parsed by `parse()` → `parseHijriDate()` |
| API `formatted` | `YYYY-MM-DD` | `1446-10-07` | Server always returns system format |

---

## 15. Dependencies

### Python

| Package | Version | Purpose |
|---------|---------|---------|
| `frappe` | v16+ | Framework (managed by bench) |
| `hijri-converter` | >= 2.3.0 | Server-side Hijri ↔ Gregorian conversion using the Umm al-Qura calendar |

Declared in `pyproject.toml`:

```toml
[project]
dependencies = [
    "hijri-converter>=2.3.0",
]
```

### JavaScript

No external JS dependencies. The Kuwaiti Algorithm is implemented as a pure JavaScript IIFE in `hijri_utils.js`.

---

## 16. Conversion Algorithms

### 16.1 Server-Side: Umm al-Qura (via `hijri-converter`)

The `hijri-converter` Python library uses pre-computed Umm al-Qura calendar data — the official Islamic calendar of Saudi Arabia. It is based on astronomical lunar observations and is accurate for years **1343–1500 AH (~1925–2076 CE)**. Dates outside this range raise `OverflowError`.

### 16.2 Server-Side Fallback: Meeus Tabular Algorithm

When `hijri-converter` raises `OverflowError` (i.e. the input date is before ~1925 CE), `gregorian_to_hijri()` automatically falls back to a pure arithmetic implementation of the **Meeus tabular Islamic calendar**. This requires no lookup tables and works for any Gregorian date after the Islamic epoch (622 CE).

**When it activates:** `gregorian_to_hijri()` catches `OverflowError` and calls `_gregorian_to_hijri_tabular(year, month, day)` instead of returning `None` or raising an error.

**Accuracy:** ±1–2 days vs. the Umm al-Qura calendar. This is the standard precision for historical Islamic dates.

**Step 1 — Gregorian → Julian Day Number (JDN)**

Uses the standard proleptic Gregorian formula:

$$a = \left\lfloor\frac{14 - m}{12}\right\rfloor, \quad y = Y + 4800 - a, \quad m' = M + 12a - 3$$

$$\text{JDN} = D + \left\lfloor\frac{153m' + 2}{5}\right\rfloor + 365y + \left\lfloor\frac{y}{4}\right\rfloor - \left\lfloor\frac{y}{100}\right\rfloor + \left\lfloor\frac{y}{400}\right\rfloor - 32045$$

**Step 2 — JDN → Hijri (Meeus tabular algorithm)**

```
l = JDN − 1948440 + 10632
n = (l − 1) ÷ 10631                     # 30-year cycle count
l = l − 10631n + 354
j = ⌊(10985−l)/5316⌋ × ⌊50l/17719⌋
  + ⌊l/5670⌋ × ⌊43l/15238⌋            # year-within-cycle (1–30)
l = l − ⌊(30−j)/15⌋ × ⌊17719j/50⌋
  − ⌊j/16⌋ × ⌊15238j/43⌋ + 29

H_year  = 30n + j − 30
H_month = ⌊24l / 709⌋
H_day   = l − ⌊709 × H_month / 24⌋
```

**Verification against the Umm al-Qura library (dates within range):**

| Gregorian | Tabular result | Library result | Match |
|---|---|---|---|
| 1930-05-10 | 1348-12-11 | 1348-12-11 | ✅ exact |
| 1925-03-01 | 1343-09-06 | 1343-09-06 | ✅ exact |

**Historical dates (tabular only):**

| Gregorian | Tabular result | Notes |
|---|---|---|
| 1907-01-25 | 1324-12-10 | Typical birth date scenario |
| 1900-01-01 | 1317-08-28 | |
| 1800-06-15 | 1215-01-22 | |

**Month name tables** (`_MONTH_NAMES_EN`, `_MONTH_NAMES_AR`) are module-level constants (index 0 unused) since the `hijri-converter` library's `.month_name()` method is unavailable for the fallback path.

### 16.3 16.3 Client-Side: Kuwaiti Algorithm

The JavaScript implementation uses the Kuwaiti Algorithm, an arithmetic approximation of the Islamic calendar. It converts via Julian Day Number as an intermediate:

**Gregorian → Hijri:**
1. Convert Gregorian to Julian Day Number (JDN)
2. Convert JDN to Hijri using the tabular Islamic calendar formula

**Hijri → Gregorian:**
1. Convert Hijri to Julian Day Number
2. Convert JDN to Gregorian

### 16.4 Algorithm Comparison

| Algorithm | Location | Range | Accuracy | Used for |
|---|---|---|---|---|
| Umm al-Qura (`hijri-converter`) | Python | 1343–1500 AH (~1925–2076 CE) | Exact (astronomical) | Primary server-side conversion |
| Meeus Tabular | Python (fallback) | Any date ≥ 622 CE | ±1–2 days | Pre-1925 CE server-side conversion |
| Kuwaiti Algorithm | JavaScript | Practical range | ±1–2 days | All client-side conversion (datepicker, display) |

### 16.5 Discrepancy Handling

The Kuwaiti Algorithm and Umm al-Qura may differ by ±1–2 days for some dates. This is handled by the **day clamping** logic in `hijri_to_gregorian()`:

1. Client picks a date using the Kuwaiti Algorithm (e.g. month 12 has 30 days in a leap year)
2. Server validates using Umm al-Qura (month 12 may only have 29 days that year)
3. If the day exceeds the actual month length, it is clamped to the last valid day
4. The response includes `clamped: true` so the client can show a notification
