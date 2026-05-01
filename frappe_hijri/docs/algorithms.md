# Conversion Algorithms

## Summary

| Algorithm | Location | Range | Accuracy | Used for |
|-----------|----------|-------|----------|---------|
| Umm al-Qura (`hijri-converter`) | Python | ~1925–2076 CE (1343–1500 AH) | Exact (astronomical) | Primary server-side |
| Meeus Tabular | Python (automatic fallback) | Any date ≥ 622 CE | ±1–2 days | Pre-1925 CE server-side |
| Kuwaiti Algorithm | JavaScript | Practical range | ±1–2 days | All client-side |

---

## Umm al-Qura (Python primary)

The `hijri-converter` library uses pre-computed Umm al-Qura data — the official Islamic calendar of Saudi Arabia, based on astronomical lunar observations. Dates outside its range raise `OverflowError`, which automatically activates the Meeus fallback.

---

## Meeus Tabular Algorithm (Python fallback)

A pure-arithmetic implementation with no lookup tables. Triggered automatically by `gregorian_to_hijri()` when `hijri-converter` raises `OverflowError`.

**Step 1 — Gregorian → Julian Day Number (JDN)**

```
a   = ⌊(14 − M) / 12⌋
y   = Y + 4800 − a
m   = M + 12a − 3
JDN = D + ⌊(153m + 2) / 5⌋ + 365y + ⌊y/4⌋ − ⌊y/100⌋ + ⌊y/400⌋ − 32045
```

**Step 2 — JDN → Hijri**

```
l       = JDN − 1948440 + 10632
n       = (l − 1) ÷ 10631
l       = l − 10631n + 354
j       = ⌊(10985−l)/5316⌋ × ⌊50l/17719⌋ + ⌊l/5670⌋ × ⌊43l/15238⌋
l       = l − ⌊(30−j)/15⌋ × ⌊17719j/50⌋ − ⌊j/16⌋ × ⌊15238j/43⌋ + 29

H_year  = 30n + j − 30
H_month = ⌊24l / 709⌋
H_day   = l − ⌊709 × H_month / 24⌋
```

**Verified against Umm al-Qura (within its range):**

| Gregorian | Meeus result | Library result |
|-----------|-------------|----------------|
| 1930-05-10 | 1348-12-11 | 1348-12-11 |
| 1925-03-01 | 1343-09-06 | 1343-09-06 |

---

## Kuwaiti Algorithm (JavaScript)

Converts via Julian Day Number as an intermediate:

- **Gregorian → Hijri:** Gregorian → JDN → Hijri (tabular Islamic calendar formula)
- **Hijri → Gregorian:** Hijri → JDN → Gregorian

Used client-side for all datepicker rendering and display formatting. No server round-trip.

---

## Discrepancy Handling

The Kuwaiti Algorithm and Umm al-Qura can differ by ±1–2 days. The `hijri_to_gregorian()` endpoint handles this with day clamping:

1. Client selects day `D` using the Kuwaiti Algorithm
2. Server checks `D` against the Umm al-Qura month length — which may be shorter
3. If `D > month_length`, the day is silently clamped to `month_length`
4. The response includes `clamped: true`

The caller should show a non-blocking alert when `clamped` is `true`:

```javascript
if (r.message.clamped) {
    frappe.show_alert({ message: __("Date adjusted to fit the Hijri month"), indicator: "orange" });
}
```
