"""
frappe_hijri.utils.formatters — patches frappe.utils.formatters.format_value.

Mirrors the "Date" and "Datetime" branches already present in
frappe/utils/formatters.py (lines 65-69) so that Hijri Date fields are
formatted consistently everywhere Frappe calls format_value:

  - Print formats (frappe.get_print)
  - Email templates (frappe.sendmail)
  - REST API responses (/api/resource)
  - Report column rendering (frappe.query_report)
  - Data Export CSV

Called once from register_hijri_date_type_map() in frappe_hijri/__init__.py
so the patch is active for every HTTP request, worker job, and bench command.
Idempotent: a module-level sentinel prevents double-wrapping.
"""

_patched = False


def patch_format_value():
	"""Monkey-patch frappe.utils.formatters.format_value for "Hijri Date".

	Idempotent — safe to call multiple times (e.g. once per request via the
	before_request hook that calls register_hijri_date_type_map).
	"""
	global _patched
	if _patched:
		return
	_patched = True

	import frappe.utils.formatters as _fmt_mod

	_original = _fmt_mod.format_value

	def _hijri_aware_format_value(
		value, df=None, doc=None, currency=None, translated=False, format=None
	):
		# Mirrors frappe/utils/formatters.py:65-66
		#   elif df.get("fieldtype") == "Date":
		#       return formatdate(value)
		if df and df.get("fieldtype") == "Hijri Date" and value:
			from frappe_hijri.utils.date_utils import format_hijri_date

			return format_hijri_date(value)

		return _original(
			value,
			df=df,
			doc=doc,
			currency=currency,
			translated=translated,
			format=format,
		)

	_fmt_mod.format_value = _hijri_aware_format_value
