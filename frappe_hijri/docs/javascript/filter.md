# JavaScript: Filter Integration

**File:** `public/js/ui/filters/hijri_filter_patch.js`

Patches three methods so `"Hijri Date"` fields behave identically to `"Date"` fields in list-view filters, report filters, and the filter builder. Also installs a mousedown guard that prevents Frappe's filter popover from closing when the user clicks inside the Hijri date picker.

---

## Where Each Patch Lives

Two of the three patches target **`frappe.ui.filter_utils`**, not `frappe.ui.Filter.prototype`. This is the critical distinction:

| Method | Object patched | Why |
|--------|---------------|-----|
| `set_conditions_from_config()` | `frappe.ui.Filter.prototype` | This is genuinely a prototype method (filter.js:77). It runs in the constructor after `invalid_condition_map` / `special_condition_labels` are created. |
| `get_default_condition(df)` | `frappe.ui.filter_utils` | Called as `this.utils.get_default_condition(df)` at filter.js:240 — lives on the utils object, not the prototype. |
| `set_fieldtype(df, fieldtype, condition)` | `frappe.ui.filter_utils` | Called as `this.utils.set_fieldtype(...)` at filter.js:243 — same utils object. |

Patching `get_default_condition` or `set_fieldtype` on `Filter.prototype` has no effect because Frappe never calls them as instance methods — it calls them via `this.utils`.

---

## Patches

### 1. `set_conditions_from_config()` — condition maps

Mirrors `filter.js:41-74`:

```javascript
// Remove "like" / "not like" (text-only operators)
this.invalid_condition_map["Hijri Date"] = ["like", "not like"];

// Human-readable operator labels
this.special_condition_labels["Hijri Date"] = {
    "<":  __("Before"),
    ">":  __("After"),
    "<=": __("On or Before"),
    ">=": __("On or After"),
};
```

### 2. `get_default_condition(df)` — default to "Between"

Returns `"Between"` when `df.fieldtype === "Hijri Date"`, so the filter opens with the range picker by default. Mirrors `filter.js:520` for `"Date"`.

```javascript
utils.get_default_condition = function (df) {
    if (df.fieldtype === "Hijri Date") return "Between";
    return origGetDefault.call(this, df);
};
```

### 3. `set_fieldtype(df, fieldtype, condition)` — fieldtype transform

Runs the original first (which resets `df.fieldtype` to `df.original_type`), then applies Hijri-specific transforms:

| Condition | `df.fieldtype` after transform | Mirrors |
|-----------|-------------------------------|---------|
| `"Between"` | `"HijriDateRange"` | `"Date"` → `"DateRange"` (line 596) |
| `"Timespan"` | `"Select"` + timespan options | `"Date"` → `"Select"` (line 599) |

When `df.fieldtype` is `"HijriDateRange"`, Frappe instantiates `ControlHijriDateRange` — a single-input range picker backed by `HijriPicker` in range mode.

```javascript
utils.set_fieldtype = function (df, fieldtype, condition) {
    origSetFieldtype.call(this, df, fieldtype, condition);

    if (condition === "Between" && df.fieldtype === "Hijri Date") {
        df.fieldtype = "HijriDateRange";
    }
    if (condition === "Timespan" && df.original_type === "Hijri Date") {
        df.fieldtype = "Select";
        df.options = this.get_timespan_options(["Last","Yesterday","Today","Tomorrow","This","Next"]);
    }
};
```

---

## Popover Mousedown Guard

Frappe's `FilterGroup.set_popover_events` (filter_list.js:65-83) binds a `document.body` mousedown handler that calls `hide_popover()` → `apply()` for any click that does not land inside the filter popover or Frappe's own air-datepicker classes (`.datepicker--cell`, `.datepicker`, etc.).

`HijriPicker` is appended to `document.body` — outside the popover. Every click on a picker cell would therefore trigger `hide_popover()` → `apply()` before the click handler fires, resetting the filter condition to `"="` and discarding the range.

**Fix:** A delegated `mousedown` handler on `.hijri-dp, .hijri-dp *` stops propagation at the picker boundary:

```javascript
$(document.body).on("mousedown.hijri_picker_guard", ".hijri-dp, .hijri-dp *", (e) => {
    e.stopPropagation();
});
```

`stopPropagation()` on `mousedown` does **not** affect the `click` event, so day-cell click handlers still fire normally. This handler is installed once at patch time — not per-instance — so it covers all picker instances simultaneously.

---

## Load Order Safety

Both `frappe.ui.Filter` and `frappe.ui.filter_utils` are part of Frappe's main bundle, guaranteed to load before any app bundle. The patch runs immediately when both exist. As a defensive fallback, `Object.defineProperty` intercepts the assignment of `frappe.ui.Filter` and fires the patch when the setter is called, in case load order ever changes.
