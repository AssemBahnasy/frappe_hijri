import frappe
from hijri_converter import Hijri, Gregorian

# Hijri month names for the tabular fallback (index 0 unused)
_MONTH_NAMES_EN = [
	"",
	"Muharram",
	"Safar",
	"Rabi' al-Awwal",
	"Rabi' al-Thani",
	"Jumada al-Ula",
	"Jumada al-Akhirah",
	"Rajab",
	"Sha'ban",
	"Ramadan",
	"Shawwal",
	"Dhu al-Qi'dah",
	"Dhu al-Hijjah",
]
_MONTH_NAMES_AR = [
	"",
	"محرم",
	"صفر",
	"ربيع الأول",
	"ربيع الثاني",
	"جمادى الأولى",
	"جمادى الآخرة",
	"رجب",
	"شعبان",
	"رمضان",
	"شوال",
	"ذو القعدة",
	"ذو الحجة",
]


def _gregorian_to_hijri_tabular(year, month, day):
	"""Fallback Gregorian → Hijri using the pure tabular Islamic calendar.

	Works for any date after the Islamic epoch (622 CE).
	Accurate to ±1-2 days vs the astronomical Umm al-Qura calendar.
	Activated automatically when hijri-converter raises OverflowError
	(i.e. dates before ~1925 CE).
	"""
	# Step 1 — Gregorian → Julian Day Number (proleptic Gregorian calendar)
	a = (14 - month) // 12
	y = year + 4800 - a
	m = month + 12 * a - 3
	jdn = day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045

	# Step 2 — JDN → Hijri (Meeus tabular Islamic calendar algorithm)
	l = jdn - 1948440 + 10632
	n = (l - 1) // 10631
	l = l - 10631 * n + 354
	j = ((10985 - l) // 5316) * ((50 * l) // 17719) + (l // 5670) * ((43 * l) // 15238)
	l = (
		l
		- ((30 - j) // 15) * ((17719 * j) // 50)
		- (j // 16) * ((15238 * j) // 43)
		+ 29
	)
	h_year = 30 * n + j - 30
	h_month = (24 * l) // 709
	h_day = l - (709 * h_month) // 24

	return {
		"year": h_year,
		"month": h_month,
		"day": h_day,
		"formatted": f"{h_year:04d}-{h_month:02d}-{h_day:02d}",
		"month_name": _MONTH_NAMES_EN[h_month],
		"month_name_ar": _MONTH_NAMES_AR[h_month],
	}


def _parse_date_string(date, title):
	"""Parse a YYYY-MM-DD string into (year, month, day) ints.

	Raises frappe.ValidationError with a clear message on any structural error,
	including missing parts (IndexError) and non-numeric parts (ValueError).
	"""
	if not date:
		frappe.throw(frappe._("Date is required."), title=frappe._(title))
	try:
		parts = str(date).split("-")
		return int(parts[0]), int(parts[1]), int(parts[2])
	except (IndexError, ValueError):
		frappe.throw(
			frappe._("Invalid date format: {0}. Expected YYYY-MM-DD.").format(date),
			title=frappe._(title),
		)


@frappe.whitelist()
def gregorian_to_hijri(date):
	"""Convert a Gregorian date string (YYYY-MM-DD) to Hijri.

	Returns a dict with keys: year, month, day, formatted, month_name,
	month_name_ar.

	For dates before ~1925 CE (outside the Umm al-Qura table range) the
	response is computed via the Meeus tabular algorithm (±1–2 days accuracy).
	"""
	y, m, d = _parse_date_string(date, "Invalid Gregorian Date")
	try:
		h = Gregorian(y, m, d).to_hijri()
	except OverflowError:
		# Date is before the Umm al-Qura table (~1925 CE).
		# Fall back to the tabular algorithm — works for any date after 622 CE.
		return _gregorian_to_hijri_tabular(y, m, d)
	except ValueError as e:
		frappe.throw(str(e), title=frappe._("Invalid Gregorian Date"))
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
	"""Convert a Hijri date to Gregorian (YYYY-MM-DD).

	Accepts either a YYYY-MM-DD date string via ``date``, or individual
	``year``, ``month``, ``day`` integers.

	If the requested day exceeds the actual month length in the Umm al-Qura
	calendar, it is silently clamped and ``clamped: true`` is returned.
	This handles the ±1–2 day discrepancy between the client-side Kuwaiti
	Algorithm and the server-side Umm al-Qura calendar.
	"""
	if date:
		year, month, day = _parse_date_string(date, "Invalid Hijri Date")
	else:
		if not year or not month or not day:
			frappe.throw(
				frappe._("Either 'date' or 'year/month/day' is required."),
				title=frappe._("Missing Parameters"),
			)
			return
		try:
			year, month, day = int(year), int(month), int(day)
		except (ValueError, TypeError):
			frappe.throw(
				frappe._("year, month, and day must be integers."),
				title=frappe._("Invalid Hijri Date"),
			)
			return

	y, m, d = year, month, day
	original_day = d
	try:
		max_day = Hijri(y, m, 1).month_length()
	except (ValueError, OverflowError) as e:
		frappe.throw(str(e), title=frappe._("Invalid Hijri Date"))
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
	"""Return the number of days in a Hijri month (29 or 30)."""
	try:
		y, m = int(year), int(month)
	except (ValueError, TypeError):
		frappe.throw(
			frappe._("year and month must be integers."),
			title=frappe._("Invalid Hijri Date"),
		)
		return
	try:
		return Hijri(y, m, 1).month_length()
	except (ValueError, OverflowError) as e:
		frappe.throw(str(e), title=frappe._("Invalid Hijri Date"))
		return  # unreachable — satisfies static analysis
