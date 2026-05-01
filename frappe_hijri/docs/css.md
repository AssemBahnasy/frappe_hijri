# CSS Reference

**File:** `public/css/hijri_datepicker.css`

Styles for the datepicker widget (`HijriPicker`). Uses only Frappe CSS variables — no hardcoded colours — for automatic light/dark theme compatibility.

---

## Picker Classes

| Class | Element | Notes |
|-------|---------|-------|
| `.hijri-dp` | Picker container | `position: absolute`, `z-index: 9999`, `width: 280px` — appended to `document.body` |
| `.hijri-dp-nav` | Navigation bar | Flex row: ← title → |
| `.hijri-dp-nav-btn` | Arrow buttons | 32×32px, hover highlight |
| `.hijri-dp-nav-title` | Month/year header | Clickable to zoom out to months/years view |
| `.hijri-dp-days-names` | Day-of-week header row | 7-column grid, uppercase, muted colour |
| `.hijri-dp-cells` | Cell grid container | CSS grid with padding |
| `.hijri-dp-cells-days` | Day grid | 7 columns |
| `.hijri-dp-cells-months` | Month grid | 3 columns |
| `.hijri-dp-cells-years` | Year grid | 4 columns |
| `.hijri-dp-day` | Day cell | 36×36px, centred |
| `.hijri-dp-month` | Month cell | Column flex; `min-height: 56px` prevents uneven rows from variable-length Arabic names |
| `.hijri-dp-year` | Year cell | Padded |
| `.hijri-dp-mar` | Arabic month name | Semibold, `--text-sm` |
| `.hijri-dp-men` | English month name | `--text-xs`, muted; white when selected |
| `.hijri-dp-footer` | Footer bar | Top border; contains "Today" |
| `.hijri-dp-today` | Today button | Full-width, centred text, hover highlight |

---

## State Modifiers

### Single-selection states

| Class | Applied when | Effect |
|-------|-------------|--------|
| `.-sel-` | Selected day / month / year | `--primary` background, white text, bold |
| `.-cur-` | Today / current month / current year (not selected) | Bold, `--primary` text colour |
| `.-other-` | Adjacent-month overflow cells | Muted, 50% opacity |

### Range-selection states

Applied by `HijriPicker` in range mode (`opts.range = true`). Mirrors air-datepicker's range highlight: start and end cells use the primary accent colour; cells between them use a faded background.

| Class | Applied when | Effect |
|-------|-------------|--------|
| `.-range-start-` | Range start cell | `--primary` background, white text, left-rounded corners |
| `.-range-end-` | Range end cell | `--primary` background, white text, right-rounded corners |
| `.-range-start-.-range-end-` | Same-day range (start = end) | Full border-radius (both sides rounded) |
| `.-range-` | Cells strictly between start and end | `--fg-hover-color` background, no border-radius (continuous strip) |

> Range state classes are updated by `update_range_highlight()` on every `mouseover` event — the method only toggles CSS classes without re-rendering the DOM, so it is safe to call at hover frequency.

---

## Frappe CSS Variables Used

| Variable | Purpose |
|----------|---------|
| `--fg-color` | Picker background |
| `--fg-hover-color` | Cell and button hover state; also in-range strip background |
| `--text-color` | Primary text |
| `--text-muted` | Day names, muted elements |
| `--border-color` | Picker border, footer divider |
| `--primary` | Selected cell background, range start/end background, current day text |
| `--border-radius`, `--border-radius-sm`, `--border-radius-lg` | Corner radii |
| `--shadow-2xl` | Picker drop shadow |
| `--text-sm`, `--text-xs` | Font sizes |
| `--weight-semibold`, `--weight-bold`, `--weight-medium` | Font weights |
