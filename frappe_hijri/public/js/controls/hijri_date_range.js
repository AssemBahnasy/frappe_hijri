/**
 * ControlHijriDateRange — Hijri date range control used by the filter system.
 *
 * Mirrors Frappe's ControlDateRange (frappe/public/js/frappe/form/controls/date_range.js):
 *   - Single <input> showing "from to to" in the configured Hijri display format.
 *   - Click the input → HijriPicker opens in range mode.
 *   - First click on a day selects the range start (highlighted).
 *   - Hover preview shows the in-range cells faded, matching air-datepicker UX.
 *   - Second click completes the range; picker closes and the input updates.
 *
 * Value contract (identical to ControlDateRange):
 *   get_value() → ["YYYY-MM-DD", "YYYY-MM-DD"] | undefined
 *   set_input(["YYYY-MM-DD", "YYYY-MM-DD"])     (called by filter restore)
 *   parse("dd-mm-yyyy to dd-mm-yyyy")           → ["YYYY-MM-DD", "YYYY-MM-DD"]
 */
frappe.ui.form.ControlHijriDateRange = class ControlHijriDateRange extends (
	frappe.ui.form.ControlData
) {
	// Prevent Frappe from calling set_value on every keystroke — value changes
	// happen only via picker selection or explicit set_value().
	static trigger_change_on_input_event = false;

	make_input() {
		super.make_input();

		this.from_val = "";
		this.to_val = "";

		const fmt = frappe_hijri.hijri.getDateFormat();
		this.$input.attr("placeholder", `${fmt} ${__("to")} ${fmt}`);

		this.picker = new frappe_hijri.HijriPicker({
			$anchor: this.$input,
			range: true,
			today_label: __("Today"),
			on_select: (from, to) => {
				this.from_val = this.obj_to_str(from);
				this.to_val = this.obj_to_str(to);
				this.$input.val(this.format_for_input([this.from_val, this.to_val]));
				// trigger("focusout") fires the handler bound by bind_filter_field_events
				// (filter.js: this.field.$input.on("focusout", () => this.on_change()))
				this.$input.trigger("focusout");
			},
		});

		this.$input.on("focus", () =>
			this.picker.show([this.from_val || null, this.to_val || null])
		);
		this.$input.on("keydown", (e) => {
			if (e.key === "Escape") this.picker.hide();
		});
	}

	// ── Value contract (mirrors ControlDateRange) ────────────────────────────────

	get_value() {
		if (this.from_val && this.to_val) return [this.from_val, this.to_val];
		if (this.from_val) return [this.from_val];
		return undefined;
	}

	/**
	 * set_input — called by the filter system when restoring a saved filter.
	 * Mirrors ControlDateRange.set_input.
	 */
	set_input(value) {
		this.value = value;
		this.last_value = value;

		if (Array.isArray(value)) {
			this.from_val = value[0] || "";
			this.to_val = value[1] || "";
		} else if (typeof value === "string" && value) {
			const parts = this.split_range_string(value);
			this.from_val = parts[0] ? this.parse_one(parts[0]) : "";
			this.to_val = parts[1] ? this.parse_one(parts[1]) : "";
		} else {
			this.from_val = "";
			this.to_val = "";
		}

		this.$input?.val(this.format_for_input([this.from_val, this.to_val]));
	}

	/**
	 * parse — called by the filter system on the raw combined value string.
	 * Accepts the localised "X to Y" separator (same as ControlDateRange.parse).
	 */
	parse(value) {
		if (!value || typeof value === "object") return value;

		const parts = this.split_range_string(String(value));
		if (parts.length < 2) return null;

		const from = this.parse_one(parts[0]);
		const to = this.parse_one(parts[1]);
		if (from && to) return [from, to];
		return null;
	}

	/**
	 * format_for_input — mirrors ControlDateRange.format_for_input.
	 * Shows the localised "from to to" string in the single input.
	 */
	format_for_input(value) {
		if (Array.isArray(value) && value[0] && value[1]) {
			return __("{0} to {1}", [
				frappe_hijri.hijri.formatHijriDate(value[0]),
				frappe_hijri.hijri.formatHijriDate(value[1]),
			]);
		}
		if (Array.isArray(value) && value[0]) {
			return frappe_hijri.hijri.formatHijriDate(value[0]);
		}
		return "";
	}

	// ── Internal helpers ─────────────────────────────────────────────────────────

	// {year, month, day} → "YYYY-MM-DD"
	obj_to_str({ year, month, day }) {
		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}

	split_range_string(value) {
		// Accept both the localised separator and bare comma (mirrors ControlDateRange.parse)
		const to_sep = __("{0} to {1}").replace("{0}", "").replace("{1}", "").trim();
		return value
			.replace(to_sep, ",")
			.replace(" to ", ",")
			.split(",")
			.map((v) => v.trim());
	}

	parse_one(raw) {
		if (!raw) return "";
		// Already system format (year > 31)?
		const parts = raw.split("-").map(Number);
		if (parts.length === 3 && !isNaN(parts[0]) && parts[0] > 31) {
			return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
		}
		// User display format
		return frappe_hijri.hijri.parseHijriDate(raw) || raw;
	}

	// ── Lifecycle ────────────────────────────────────────────────────────────────

	destroy() {
		this.picker?.destroy();
		super.destroy();
	}
};
