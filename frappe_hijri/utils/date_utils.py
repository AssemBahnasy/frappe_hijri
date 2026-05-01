"""
frappe_hijri.utils.date_utils — server-side Hijri date helpers.

Mirrors the role of frappe/utils/dateutils.py for Gregorian dates.
Call validate_hijri_date() from a DocType's validate() method to enforce
data integrity on Hijri Date fields at save time and during data import.
"""

import frappe


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def validate_hijri_date(value, fieldname=None, label=None):
	"""Validate a stored Hijri date value (YYYY-MM-DD) and throw on failure.

	Call from a document controller's validate() method for each Hijri Date
	field that requires server-side enforcement (e.g. Data Importer bypass).

	Args:
		value:     The field value as stored in the document (str or None).
		fieldname: The fieldname — used in the error message when label is None.
		label:     Human-readable label shown in the validation error.

	Raises:
		frappe.ValidationError if the value is not a valid Hijri date.

	Example (in a DocType controller)::

		from frappe_hijri.utils.date_utils import validate_hijri_date

		class MyDoc(Document):
			def validate(self):
				validate_hijri_date(
					self.birth_date_hijri,
					fieldname="birth_date_hijri",
					label=self.meta.get_field("birth_date_hijri").label,
				)
	"""
	if not value:
		return

	display = label or fieldname or frappe._("Hijri Date")

	# Step 1 — structural check
	try:
		parts = str(value).split("-")
		y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
	except (ValueError, IndexError, AttributeError):
		frappe.throw(
			frappe._("{0}: invalid Hijri date {1!r}. Expected YYYY-MM-DD.").format(
				display, value
			),
			title=frappe._("Invalid Hijri Date"),
		)
		return  # unreachable — satisfies static analysis

	# Step 2 — month range
	if not 1 <= m <= 12:
		frappe.throw(
			frappe._("{0}: month must be 1–12, got {1}.").format(display, m),
			title=frappe._("Invalid Hijri Date"),
		)
		return

	# Step 3 — day range (Umm al-Qura when available, tabular fallback)
	max_day = _month_length(y, m)
	if not 1 <= d <= max_day:
		frappe.throw(
			frappe._(
				"{0}: day {1} is out of range — Hijri month {2}/{3} has only {4} days."
			).format(display, d, m, y, max_day),
			title=frappe._("Invalid Hijri Date"),
		)


def format_hijri_date(value, fmt=None):
	"""Format a stored Hijri date (YYYY-MM-DD) to the configured display format.

	Mirrors frappe.utils.formatdate() for Gregorian dates.
	Called by the format_value patch in frappe_hijri.utils.formatters so that
	print formats, email templates, and REST responses show the display format
	rather than the raw storage format.

	Args:
		value: Stored date string in YYYY-MM-DD format.
		fmt:   Format string (e.g. "dd-mm-yyyy").  When None, reads from
		       Hijri Settings — same source as frappe.boot.hijri_date_format.

	Returns:
		Formatted string, or the original value if it cannot be parsed.
	"""
	if not value:
		return ""
	if fmt is None:
		from frappe_hijri import get_hijri_date_format

		fmt = get_hijri_date_format()
	try:
		parts = str(value).split("-")
		yyyy = parts[0]
		mm = parts[1].zfill(2)
		dd = parts[2].zfill(2)
	except (IndexError, AttributeError):
		return value

	return fmt.replace("yyyy", yyyy).replace("mm", mm).replace("dd", dd)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _month_length(year, month):
	"""Return the number of days in a Hijri month.

	Uses the Umm al-Qura library for dates in its supported range
	(~1343–1500 AH).  Falls back to the tabular approximation for
	historical dates, consistent with api/hijri.py's fallback strategy.
	"""
	try:
		from hijri_converter import Hijri

		return Hijri(year, month, 1).month_length()
	except (ValueError, OverflowError, ImportError):
		# Tabular approximation: odd months 30 days, even 29, month-12 leap 30
		if month == 12 and _is_leap_year(year):
			return 30
		return 30 if month % 2 == 1 else 29


def _is_leap_year(hy):
	"""Tabular Hijri leap-year check (30-year cycle)."""
	return (hy % 30) in {2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29}
