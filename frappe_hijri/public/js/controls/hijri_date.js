/**
 * ControlHijriDate — Frappe form control for the "Hijri Date" fieldtype.
 *
 * Extends ControlData (not ControlDate) to avoid conflicts with Frappe's
 * air-datepicker library. Delegates all calendar UI to frappe_hijri.HijriPicker
 * (controls/hijri_picker.js), which appends to document.body and applies
 * viewport-aware flip logic — mirroring check_and_set_date_picker_position in
 * frappe/public/js/frappe/form/controls/date.js.
 *
 * Storage format : YYYY-MM-DD  (varchar 10 in DB, same as Frappe's Date field)
 * Display format : Configured in Hijri Settings → Date Format
 *                  e.g. "dd-mm-yyyy" → "07-10-1446"
 *
 * Keyboard shortcuts (mirrors ControlDate.set_t_for_today — date.js:143):
 *   t          → set today's Hijri date
 *   Escape     → close the picker
 */
frappe.ui.form.ControlHijriDate = class ControlHijriDate extends frappe.ui.form.ControlData {
	// Prevents Frappe from calling set_value() on every keystroke.
	// Value changes happen only via picker selection or explicit set_value().
	// Mirrors ControlDate behaviour (air-datepicker handles its own events).
	static trigger_change_on_input_event = false;

	make_input() {
		super.make_input();
		this.today_text = __("Today");

		this.picker = new frappe_hijri.HijriPicker({
			$anchor: this.$input,
			on_select: (hy, hm, hd) => this.on_picker_select(hy, hm, hd),
			today_label: this.today_text,
			can_write: () => this.can_write(),
		});

		this.setup_keyboard();
	}

	// ── Keyboard ────────────────────────────────────────────────────────────────
	// Mirrors ControlDate.set_t_for_today (date.js:143)

	setup_keyboard() {
		this.$input.on("focus", () => this.picker.show(this.get_value()));

		this.$input.on("keydown", (e) => {
			if (e.key === "Escape") {
				this.picker.hide();
				return;
			}
			// 't' with no modifier = today (mirrors date.js:146-158)
			if (e.key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
				const t = this.get_now_date();
				this.on_picker_select(t.year, t.month, t.day);
				return false;
			}
		});
	}

	// Mirrors ControlDate.get_now_date (date.js:138)
	get_now_date() {
		const now = new Date();
		return frappe_hijri.hijri.gregorianToHijri(
			now.getFullYear(),
			now.getMonth() + 1,
			now.getDate()
		);
	}

	// ── Value pipeline ──────────────────────────────────────────────────────────
	// Each method mirrors its counterpart in ControlDate / ControlData.

	on_picker_select(hy, hm, hd) {
		const s = `${hy}-${String(hm).padStart(2, "0")}-${String(hd).padStart(2, "0")}`;
		this.set_value(s);
	}

	get_value() {
		return this.value || "";
	}

	/**
	 * format_for_input — system YYYY-MM-DD → user display format.
	 * Mirrors ControlDate.format_for_input which calls frappe.datetime.str_to_user.
	 */
	format_for_input(value) {
		return frappe_hijri.hijri.formatHijriDate(value);
	}

	set_formatted_input(value) {
		if (this.$input) this.$input.val(this.format_for_input(value));
	}

	/**
	 * parse — converts user input back to system format YYYY-MM-DD.
	 *
	 * Strategy (mirrors ControlDate.parse which calls eval_expression):
	 * 1. If already system format (first segment > 31, unambiguous for Hijri
	 *    years ≥ 1000), validate and return as-is.
	 *    Critical for Frappe's read-only path: get_status() calls parse() on
	 *    the raw DB value during set_disp_area().
	 * 2. Otherwise parse as user display format via parseHijriDate().
	 */
	parse(value) {
		if (!value) return "";

		// Path 1: system format detection
		const parts = value.split("-").map(Number);
		if (
			parts.length === 3 &&
			!isNaN(parts[0]) &&
			parts[0] > 31 &&
			parts[1] >= 1 &&
			parts[1] <= 12 &&
			parts[2] >= 1
		) {
			const max_day = frappe_hijri.hijri.hijriMonthDays(parts[0], parts[1]);
			if (parts[2] <= max_day) {
				return (
					parts[0] +
					"-" +
					String(parts[1]).padStart(2, "0") +
					"-" +
					String(parts[2]).padStart(2, "0")
				);
			}
		}

		// Path 2: user display format
		const sys = frappe_hijri.hijri.parseHijriDate(value);
		if (!sys) return "";
		const p = sys.split("-").map(Number);
		if (p[1] < 1 || p[1] > 12 || p[2] < 1) return "";
		const max_day = frappe_hijri.hijri.hijriMonthDays(p[0], p[1]);
		if (p[2] > max_day) return "";
		return sys;
	}

	/**
	 * validate — called by Frappe's form engine after parse().
	 * Uses frappe.show_alert (non-blocking) instead of frappe.msgprint,
	 * matching modern Frappe UX patterns.
	 * Mirrors ControlDate.validate (date.js:247).
	 */
	validate(value) {
		if (!value) return "";

		const p = value.split("-").map(Number);
		if (p.length !== 3 || isNaN(p[0]) || p[1] < 1 || p[1] > 12 || p[2] < 1) {
			frappe.show_alert({
				message: __("Hijri Date must be in format: {0}", [
					frappe_hijri.hijri.getDateFormat(),
				]),
				indicator: "red",
			});
			return "";
		}

		const max_day = frappe_hijri.hijri.hijriMonthDays(p[0], p[1]);
		if (p[2] > max_day) {
			frappe.show_alert({
				message: __("{0} has only {1} days in Hijri month {2}", [
					p[0],
					max_day,
					p[1],
				]),
				indicator: "red",
			});
			return "";
		}

		return value;
	}

	// ── Lifecycle ────────────────────────────────────────────────────────────────

	destroy() {
		this.picker?.destroy();
		super.destroy();
	}
};
