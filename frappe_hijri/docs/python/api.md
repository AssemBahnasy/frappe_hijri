# Server API

**File:** `frappe_hijri/api/hijri.py`
**Library:** `hijri-converter` (Umm al-Qura calendar) with automatic Meeus tabular fallback for dates before ~1925 CE.

---

## `gregorian_to_hijri(date)`

| | |
|---|---|
| Parameter | `date` — Gregorian `YYYY-MM-DD` string |
| Returns | `{year, month, day, formatted, month_name, month_name_ar}` |
| Errors | `frappe.ValidationError` (title: "Invalid Gregorian Date") for structurally invalid input |

Dates in range 1343–1500 AH (~1925–2076 CE) use the Umm al-Qura library. Earlier dates silently fall back to the Meeus tabular algorithm — see [Conversion Algorithms](../algorithms.md).

```javascript
frappe.call({
    method: "frappe_hijri.api.hijri.gregorian_to_hijri",
    args: { date: "2025-04-06" },
    callback: (r) => console.log(r.message)
    // → {year: 1446, month: 10, day: 8, formatted: "1446-10-08",
    //    month_name: "Shawwal", month_name_ar: "شوال"}
});
```

---

## `hijri_to_gregorian(year?, month?, day?, date?)`

| | |
|---|---|
| Parameters | Either `date` (Hijri `YYYY-MM-DD` string) **or** individual `year`, `month`, `day` integers |
| Returns | `{year, month, day, formatted, clamped}` |
| Errors | `"Missing Parameters"` or `"Invalid Hijri Date"` |

**Day clamping:** When the requested day exceeds the Umm al-Qura month length (which can differ from the client-side Kuwaiti Algorithm by ±1 day), the day is silently clamped and `clamped: true` is set in the response.

```javascript
frappe.call({
    method: "frappe_hijri.api.hijri.hijri_to_gregorian",
    args: { date: frm.doc.hijri_date_field },  // e.g. "1446-01-01"
    callback: (r) => {
        frm.set_value("gregorian_date", r.message.formatted);
        if (r.message.clamped) {
            frappe.show_alert({ message: __("Date adjusted to fit Hijri month"), indicator: "orange" });
        }
    }
});
```

---

## `get_hijri_month_length(year, month)`

| | |
|---|---|
| Parameters | `year`, `month` — Hijri year and month as integers |
| Returns | Integer — days in that month (29 or 30) |
| Errors | `"Invalid Hijri Date"` |
