/**
 * Hijri Date filter integration.
 *
 * Patches frappe.ui.Filter and frappe.ui.filter_utils so that "Hijri Date"
 * fields behave exactly like "Date" fields in list-view filters, report
 * filters, and the filter builder.
 *
 * Methods patched and where they actually live:
 *
 *  frappe.ui.Filter.prototype.set_conditions_from_config()
 *      Runs inside the Filter constructor after invalid_condition_map and
 *      special_condition_labels are created.  We append our entries here so
 *      they are present before make() renders the condition dropdown.
 *      Mirrors filter.js:41-74.
 *
 *  frappe.ui.filter_utils.get_default_condition(df)   ← NOTE: filter_utils, not Filter.prototype
 *      Called as this.utils.get_default_condition(df) at filter.js:240.
 *      Returns "Between" for Date/Datetime (filter.js:520).
 *      Extended to return "Between" for "Hijri Date" as well.
 *
 *  frappe.ui.filter_utils.set_fieldtype(df, fieldtype, condition)   ← NOTE: filter_utils
 *      Called as this.utils.set_fieldtype(...) at filter.js:243.
 *      Transforms "Date" + "Between" → "DateRange" (filter.js:596).
 *      Extended to transform "Hijri Date" + "Between" → "HijriDateRange"
 *      (rendered by ControlHijriDateRange — controls/hijri_date_range.js).
 */
(function () {
	const HIJRI_DATE = "Hijri Date";
	const HIJRI_DATE_RANGE = "HijriDateRange";

	function applyPatch() {
		const proto = frappe.ui.Filter.prototype;
		const utils = frappe.ui.filter_utils;

		// ── 0. Popover mousedown guard ────────────────────────────────────────
		// Frappe's FilterGroup.set_popover_events (filter_list.js:65-83) binds a
		// document.body mousedown handler that closes the filter popover when a
		// click lands outside it.  It only exempts Frappe's own air-datepicker
		// classes (.datepicker--cell, .datepicker, etc.).
		//
		// Our HijriPicker is appended to document.body — outside the popover —
		// so every click on it triggers hide_popover() → apply() before our
		// click handler fires, resetting the filter to ID.
		//
		// Fix: stop mousedown propagation at the .hijri-dp boundary so it never
		// reaches document.body.  stopPropagation on mousedown does NOT affect
		// the click event, so our day-cell click handlers still fire normally.
		$(document.body).on("mousedown.hijri_picker_guard", ".hijri-dp, .hijri-dp *", (e) => {
			e.stopPropagation();
		});

		// ── 1. Condition maps (frappe.ui.Filter.prototype) ────────────────────
		// set_conditions_from_config IS a method of frappe.ui.Filter (filter.js:77).

		const origSetConditions = proto.set_conditions_from_config;
		proto.set_conditions_from_config = function () {
			origSetConditions.call(this);

			// Mirrors filter.js:42 — remove "like" / "not like" for date types
			this.invalid_condition_map[HIJRI_DATE] = ["like", "not like"];

			// Mirrors filter.js:62-67 — human-readable operator labels
			this.special_condition_labels[HIJRI_DATE] = {
				"<": __("Before"),
				">": __("After"),
				"<=": __("On or Before"),
				">=": __("On or After"),
			};
		};

		// ── 2. Default condition (frappe.ui.filter_utils) ─────────────────────
		// Called as this.utils.get_default_condition(df) at filter.js:240.
		// Mirrors filter.js:520 — Date/Datetime default to "Between".

		const origGetDefault = utils.get_default_condition;
		utils.get_default_condition = function (df) {
			if (df.fieldtype === HIJRI_DATE) return "Between";
			return origGetDefault.call(this, df);
		};

		// ── 3. Fieldtype transformation (frappe.ui.filter_utils) ──────────────
		// Called as this.utils.set_fieldtype(df, fieldtype, condition) at filter.js:243.
		// We run the original first (it resets df.fieldtype to original_type), then
		// apply our Hijri-specific transforms on top.
		//
		//  "Between"  → "HijriDateRange"  (mirrors Date → DateRange, line 596)
		//  "Timespan" → "Select"           (mirrors Date → Select,     line 599)

		const origSetFieldtype = utils.set_fieldtype;
		utils.set_fieldtype = function (df, fieldtype, condition) {
			origSetFieldtype.call(this, df, fieldtype, condition);

			// After origSetFieldtype the original_type is set and df.fieldtype has
			// been reset to original_type.  For "Hijri Date" the original function
			// leaves it unchanged — apply our transforms now.

			if (condition === "Between" && df.fieldtype === HIJRI_DATE) {
				df.fieldtype = HIJRI_DATE_RANGE;
			}

			if (condition === "Timespan" && df.original_type === HIJRI_DATE) {
				df.fieldtype = "Select";
				df.options = this.get_timespan_options([
					"Last",
					"Yesterday",
					"Today",
					"Tomorrow",
					"This",
					"Next",
				]);
			}
		};
	}

	// frappe.ui.Filter and frappe.ui.filter_utils are both part of Frappe's main
	// bundle, guaranteed to load before any app bundle.
	if (frappe.ui && frappe.ui.Filter && frappe.ui.filter_utils) {
		applyPatch();
	} else {
		// Defensive fallback: intercept the setter in case load order changes.
		frappe.provide("frappe.ui");
		let filterRef = frappe.ui.Filter;
		Object.defineProperty(frappe.ui, "Filter", {
			configurable: true,
			enumerable: true,
			get() {
				return filterRef;
			},
			set(val) {
				filterRef = val;
				if (val && frappe.ui.filter_utils) applyPatch();
			},
		});
	}
})();
