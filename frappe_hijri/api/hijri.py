import frappe
from hijri_converter import Hijri, Gregorian

# Hijri month names for the tabular fallback (index 0 unused)
_MONTH_NAMES_EN = [
    "", "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
]
_MONTH_NAMES_AR = [
    "", "محرم", "صفر", "ربيع الأول", "ربيع الثاني",
    "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
    "رمضان", "شوال", "ذو القعدة", "ذو الحجة",
]


def _gregorian_to_hijri_tabular(year, month, day):
    """
    Fallback Gregorian → Hijri conversion using the pure tabular Islamic
    calendar algorithm.  Works for any date after the Islamic epoch (622 CE).
    Accurate to ±1-2 days compared to the astronomical Umm al-Qura calendar.
    Used automatically when the Umm al-Qura library raises OverflowError
    (i.e. dates before ~1925 CE).
    """
    # Step 1 — Gregorian → Julian Day Number (proleptic Gregorian calendar)
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    jdn = (day + (153 * m + 2) // 5 + 365 * y
           + y // 4 - y // 100 + y // 400 - 32045)

    # Step 2 — JDN → Hijri (Meeus tabular Islamic calendar algorithm)
    l = jdn - 1948440 + 10632
    n = (l - 1) // 10631
    l = l - 10631 * n + 354
    j = (((10985 - l) // 5316) * ((50 * l) // 17719)
         + (l // 5670) * ((43 * l) // 15238))
    l = (l - ((30 - j) // 15) * ((17719 * j) // 50)
         - (j // 16) * ((15238 * j) // 43) + 29)
    h_year = 30 * n + j - 30
    h_month = (24 * l) // 709
    h_day = l - (709 * h_month) // 24

    return {
        "year":         h_year,
        "month":        h_month,
        "day":          h_day,
        "formatted":    f"{h_year:04d}-{h_month:02d}-{h_day:02d}",
        "month_name":   _MONTH_NAMES_EN[h_month],
        "month_name_ar": _MONTH_NAMES_AR[h_month],
    }


@frappe.whitelist()
def gregorian_to_hijri(date):
    """Convert a Gregorian date string (YYYY-MM-DD) to Hijri."""
    parts = date.split("-")
    try:
        h = Gregorian(int(parts[0]), int(parts[1]), int(parts[2])).to_hijri()
    except OverflowError:
        # Date is before the Umm al-Qura table (~1925 CE).
        # Fall back to the tabular algorithm — works for any date after 622 CE.
        return _gregorian_to_hijri_tabular(int(parts[0]), int(parts[1]), int(parts[2]))
    except ValueError as e:
        frappe.throw(str(e), title="Invalid Gregorian Date")
        return  # unreachable — satisfies static analysis
    return {
        "year": h.year,
        "month": h.month,
        "day": h.day,
        "formatted": str(h),
        "month_name": h.month_name(),
        "month_name_ar": h.month_name("ar"),
    }


@frappe.whitelist()
def hijri_to_gregorian(year=None, month=None, day=None, date=None):
    """Convert a Hijri date to Gregorian date string (YYYY-MM-DD).

    Accepts either a date string (YYYY-MM-DD) or individual year/month/day.
    """
    if date:
        parts = str(date).split("-")
        year, month, day = parts[0], parts[1], parts[2]
    if not year or not month or not day:
        frappe.throw("Either 'date' or 'year/month/day' is required",
                     title="Missing Parameters")
        return
    y, m, d = int(year), int(month), int(day)
    original_day = d
    try:
        max_day = Hijri(y, m, 1).month_length()
    except (ValueError, OverflowError) as e:
        frappe.throw(str(e), title="Invalid Hijri Date")
        return  # unreachable — satisfies static analysis
    if d > max_day:
        d = max_day
    greg = Hijri(y, m, d).to_gregorian()
    return {
        "year": greg.year,
        "month": greg.month,
        "day": greg.day,
        "formatted": greg.strftime("%Y-%m-%d"),
        "clamped": d != original_day,
    }


@frappe.whitelist()
def get_hijri_month_length(year, month):
    """Get the number of days in a Hijri month."""
    try:
        return Hijri(int(year), int(month), 1).month_length()
    except (ValueError, OverflowError) as e:
        frappe.throw(str(e), title="Invalid Hijri Date")
        return  # unreachable — satisfies static analysis
