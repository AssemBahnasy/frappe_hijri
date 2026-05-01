# JavaScript: Form Controls

---

## ControlHijriDate

**File:** `public/js/controls/hijri_date.js`
**Class:** `frappe.ui.form.ControlHijriDate extends frappe.ui.form.ControlData`

### Why `ControlData` and Not `ControlDate`

`ControlDate` initialises Frappe's air-datepicker on construction. Extending it would produce two conflicting datepickers on the same input. `ControlData` provides a plain text input with no datepicker — a clean base.

### Static Properties

| Property | Value | Effect |
|----------|-------|--------|
| `trigger_change_on_input_event` | `false` | Prevents `set_value()` on every keystroke; value changes only via picker selection or explicit `set_value()` |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `t` (no modifiers) | Select today's Hijri date |
| `Escape` | Close picker |

Mirrors `ControlDate.set_t_for_today` in `frappe/public/js/frappe/form/controls/date.js`.

### Value Pipeline

| Method | Direction | Notes |
|--------|-----------|-------|
| `format_for_input(value)` | `YYYY-MM-DD` → display | Calls `frappe_hijri.hijri.formatHijriDate()` |
| `set_formatted_input(value)` | → `<input>.val()` | Calls `format_for_input()` |
| `parse(value)` | display → `YYYY-MM-DD` | System-format check first; then `parseHijriDate()` |
| `validate(value)` | — | Month/day range; shows `frappe.show_alert` on failure |
| `get_value()` | → stored value | Returns `this.value` or `""` |

**`parse()` system-format detection:** Checks whether the first `-`-delimited segment is `> 31`. Hijri years are always ≥ 1000 so a year is unambiguously distinguishable from a day. This is critical for Frappe's read-only path: `get_status()` calls `parse()` on the raw DB value during `set_disp_area()` — without this check the year would be misread as a day.

---

## ControlHijriDateRange

**File:** `public/js/controls/hijri_date_range.js`
**Class:** `frappe.ui.form.ControlHijriDateRange extends frappe.ui.form.ControlData`

Used exclusively by the filter system when the condition is `"Between"` on a `"Hijri Date"` field. Mirrors Frappe's `ControlDateRange` (`frappe/public/js/frappe/form/controls/date_range.js`).

### Layout

A **single `<input>`** showing `"from to to"` in the configured Hijri display format. Clicking the input opens `HijriPicker` in range mode. The user selects the start date with a first click and drags/hovers to preview the range, then completes it with a second click. The picker closes automatically and the input updates.

This matches Frappe's `ControlDateRange` UX exactly — a single input field, range selection by click-drag, no separate from/to inputs.

### Static Properties

| Property | Value | Effect |
|----------|-------|--------|
| `trigger_change_on_input_event` | `false` | Prevents Frappe from calling `set_value()` on every keystroke; values only change via picker selection or explicit `set_value()` |

### `make_input()`

```javascript
make_input() {
    super.make_input();              // creates this.$input (ControlData base)
    this.from_val = "";
    this.to_val = "";

    this.picker = new frappe_hijri.HijriPicker({
        $anchor: this.$input,
        range: true,
        today_label: __("Today"),
        on_select: (from, to) => {
            this.from_val = this.obj_to_str(from);
            this.to_val   = this.obj_to_str(to);
            this.$input.val(this.format_for_input([this.from_val, this.to_val]));
            this.$input.trigger("focusout");   // fires filter's on_change()
        },
    });

    this.$input.on("focus", () =>
        this.picker.show([this.from_val || null, this.to_val || null])
    );
    this.$input.on("keydown", (e) => {
        if (e.key === "Escape") this.picker.hide();
    });
}
```

> **Why `trigger("focusout")` and not `trigger("change")`:** Frappe's `bind_filter_field_events` (filter.js) listens to `focusout` on `this.field.$input` to call `on_change()` and apply the filter. Using `"change"` would be ignored.

### Value Contract

| Method | Signature | Notes |
|--------|-----------|-------|
| `get_value()` | `→ ["YYYY-MM-DD", "YYYY-MM-DD"] \| undefined` | Returns `undefined` when `from_val` is empty |
| `set_input(value)` | `(array \| string)` | Called by filter restore. Handles both `["YYYY-MM-DD","YYYY-MM-DD"]` arrays and `"X to Y"` display strings |
| `parse(value)` | `(string) → array \| null` | Parses `"dd-mm-yyyy to dd-mm-yyyy"` → `["YYYY-MM-DD", "YYYY-MM-DD"]` |
| `format_for_input(value)` | `(array) → string` | Returns localised `"{from} to {to}"` via `frappe_hijri.hijri.formatHijriDate()` |

### Internal Helpers

| Method | Description |
|--------|-------------|
| `obj_to_str({ year, month, day })` | Converts picker's `{year, month, day}` object to `"YYYY-MM-DD"` string |
| `split_range_string(value)` | Splits a `"X to Y"` string by the localised separator or a bare comma; returns a two-element array |
| `parse_one(raw)` | Converts one half of a range string to system format; handles both display format and already-stored `"YYYY-MM-DD"` |
