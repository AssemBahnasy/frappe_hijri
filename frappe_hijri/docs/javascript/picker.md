# JavaScript: HijriPicker

**File:** `public/js/controls/hijri_picker.js`
**Namespace:** `frappe_hijri.HijriPicker`

Shared calendar widget used by both `ControlHijriDate` and `ControlHijriDateRange`. Not a Frappe control — a standalone UI class that attaches to any `<input>`.

---

## Why Body-Append

The picker `<div class="hijri-dp">` is appended to `document.body` with `position: absolute` and document-relative coordinates. This prevents clipping by `overflow: hidden` containers (modals, Quick Entry, dialogs, sidebars). Mirrors Frappe's air-datepicker strategy.

---

## Constructor

```javascript
new frappe_hijri.HijriPicker({
    $anchor,       // jQuery — the <input> to position the picker below
    on_select,     // Single mode: (year, month, day) → void
                   // Range  mode: ({year,month,day} from, {year,month,day} to) → void
    range,         // optional boolean — enable range selection (default: false)
    today_label,   // optional string — localised "Today" text
    can_write,     // optional () → bool — return false to suppress opening (e.g. read-only)
})
```

Each instance gets a unique `event_ns` so concurrent pickers clean up their `mousedown` listeners independently without affecting each other.

---

## Public API

| Method | Description |
|--------|-------------|
| `show(current_value)` | Open the picker. Single mode: `"YYYY-MM-DD"` string or falsy for today. Range mode: `["YYYY-MM-DD", "YYYY-MM-DD"]` to restore a saved range, or falsy to start fresh. |
| `hide()` | Close the picker |
| `destroy()` | Remove from DOM and clean up the `mousedown` event listener |

---

## Positioning (`set_position()`)

Mirrors `check_and_set_date_picker_position` in `frappe/public/js/frappe/form/controls/date.js`:

1. Temporarily makes the picker invisible-but-visible to measure its height
2. Computes document-relative `top` and `left` from `getBoundingClientRect()` + `window.scrollTop/Left`
3. **Flips above** the anchor when `space_below < picker_height && rect.top > picker_height`
4. Clamps `left` to the right edge of the viewport

---

## Navigation Views

| View | Activated by | Renders |
|------|-------------|---------|
| Days (default) | `show()` | 7-column day grid for the current Hijri month |
| Months | Click the days-view header | 3×4 grid of Arabic + English month names |
| Years | Click the months-view header | 4×3 grid for the current decade (±1 overflow cell) |

Navigation arrows shift by month / year / decade depending on the active view. The years view header is the top level — clicking it does nothing.

---

## Single Mode

`select(hy, hm, hd)` stores `this.selected`, fires `on_select(year, month, day)`, then calls `hide()`. The caller (`ControlHijriDate`) formats and persists the value.

---

## Range Mode

Enabled with `opts.range = true`. The user picks a date range in two clicks, with a hover preview between clicks — matching Frappe's air-datepicker `range: true` UX.

### State Variables

| Variable | Type | Meaning |
|----------|------|---------|
| `range_start` | `{year, month, day} \| null` | First click anchor |
| `range_end` | `{year, month, day} \| null` | Second click (confirmed end) |
| `range_hover` | `{year, month, day} \| null` | Mouse position during preview |
| `awaiting_end` | `boolean` | `true` between first and second click |

### Two-Phase Click (`bind_days_range`)

1. **First click** — sets `range_start`, clears `range_end` and `range_hover`, sets `awaiting_end = true`, calls `update_range_highlight()`.
2. **Hover** — while `awaiting_end`, each `mouseover` sets `range_hover` and calls `update_range_highlight()`. `mouseleave` clears `range_hover`.
3. **Second click** — normalises order (`from ≤ to`), sets `range_start`/`range_end`, clears `awaiting_end`, fires `on_select(from, to)`, calls `hide()`.

> **Binding gotcha:** hover events must always be bound unconditionally. Wrapping the `.on("mouseover", ...)` call in `if (this.awaiting_end)` silently prevents the handler from ever registering because `awaiting_end` is always `false` at render time. The guard belongs inside the handler: `if (!this.awaiting_end) return;`.

### "Today" in Range Mode

Clicking "Today" in the footer fires `on_select(today, today)` — a same-day range — and closes the picker immediately without waiting for a second click.

### `update_range_highlight(hy, hm)`

Updates CSS classes on all visible day cells without re-rendering the DOM. Removes `.-sel- .-range-start- .-range-end- .-range-` then re-applies via `range_cell_classes()`. Safe to call on every `mouseover` event.

### `range_cell_classes(hy, hm, d, r_low, r_high) → string`

Returns the extra CSS class string for a single day cell based on its position relative to the normalised range:

- Only start selected, no end → `.-range-start-` on the start cell, `""` elsewhere
- `r_low === r_high` → same-day range: both `.-range-start-` and `.-range-end-`
- `d === r_low` → `.-range-start-`
- `d === r_high` → `.-range-end-`
- Between → `.-range-`

### `range_bounds() → { r_low, r_high }`

Returns the normalised lower/upper bound for highlight calculations. Uses `range_hover` as a proxy for `range_end` while the user is previewing. Always ensures `r_low ≤ r_high` regardless of selection order.

### Helper Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `parse_stored(value)` | `(string) → {year,month,day} \| null` | Parses a stored `"YYYY-MM-DD"` string into an object. Returns `null` for falsy or non-system-format input. Detection: first segment must be `> 31` (Hijri years are always ≥ 1000). |
| `cmp_date(a, b)` | `({year,month,day}, {year,month,day}) → number` | Chronological comparator — negative if `a < b`, `0` if equal, positive if `a > b`. Used by `range_bounds()` to normalise order and by `range_cell_classes()` for in-range checks. |
