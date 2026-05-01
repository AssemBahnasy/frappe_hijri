# JavaScript: Conversion Utilities

**File:** `public/js/utils/hijri_utils.js`
**Namespace:** `frappe_hijri.hijri` (IIFE — created first in the bundle)

All functions are pure — no server calls, no DOM access, no side effects.

---

## Conversion

### `gregorianToHijri(gy, gm, gd) → {year, month, day}`

Converts a Gregorian date to Hijri using the Kuwaiti Algorithm via Julian Day Number.

### `hijriToGregorian(hy, hm, hd) → {year, month, day}`

Converts a Hijri date to Gregorian using the Kuwaiti Algorithm via Julian Day Number.

---

## Formatting

### `getDateFormat() → string`

Returns `frappe.boot.hijri_date_format` (set by `extend_bootinfo`). Falls back to `"yyyy-mm-dd"`.

### `formatHijriDate(value) → string`

Converts a stored system-format date to the user's display format.

```javascript
frappe_hijri.hijri.formatHijriDate("1446-10-07")
// "07-10-1446"  (when format is "dd-mm-yyyy")
// "07/10/1446"  (when format is "dd/mm/yyyy")
```

Replaces `yyyy`, `mm`, `dd` tokens in the format string with zero-padded values from the input.

### `parseHijriDate(value) → string`

Converts a user-formatted date back to system format. Returns `""` if unparseable.

```javascript
frappe_hijri.hijri.parseHijriDate("07-10-1446")  // "1446-10-07"
```

Detects the separator from `getDateFormat()`, then maps positional tokens to parts of the input.

---

## Calendar

### `hijriMonthDays(hy, hm) → number`

Month lengths per the tabular Islamic calendar:

- Odd months (1, 3, 5, 7, 9, 11): 30 days
- Even months (2, 4, 6, 8, 10): 29 days
- Month 12: 30 in leap years, 29 otherwise

### `isHijriLeapYear(hy) → boolean`

Leap years occur at positions 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 in the 30-year cycle.

### `getMonthName(month) → string`

Arabic name for the given month number (1–12).

### `getMonthNameEn(month) → string`

English transliteration for the given month number.

| Month | Arabic | English |
|-------|--------|---------|
| 1 | محرم | Muharram |
| 2 | صفر | Safar |
| 3 | ربيع الأول | Rabi al-Awwal |
| 4 | ربيع الثاني | Rabi al-Thani |
| 5 | جمادى الأولى | Jumada al-Ula |
| 6 | جمادى الآخرة | Jumada al-Akhirah |
| 7 | رجب | Rajab |
| 8 | شعبان | Shaban |
| 9 | رمضان | Ramadan |
| 10 | شوال | Shawwal |
| 11 | ذو القعدة | Dhul Qadah |
| 12 | ذو الحجة | Dhul Hijjah |
