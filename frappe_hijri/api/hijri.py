import frappe
from hijri_converter import Hijri, Gregorian


@frappe.whitelist()
def gregorian_to_hijri(date):
    """Convert a Gregorian date string (YYYY-MM-DD) to Hijri."""
    parts = date.split("-")
    try:
        h = Gregorian(int(parts[0]), int(parts[1]), int(parts[2])).to_hijri()
    except (ValueError, OverflowError) as e:
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
