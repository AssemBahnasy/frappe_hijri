/**
 * HijriPicker — shared calendar widget used by ControlHijriDate and
 * ControlHijriDateRange.
 *
 * Not a Frappe control — a standalone UI class attached to any <input>.
 * Appended to document.body so it is never clipped by overflow:hidden
 * containers (modals, Quick Entry, dialogs, sidebars).
 *
 * Positioning mirrors Frappe's check_and_set_date_picker_position in
 * frappe/public/js/frappe/form/controls/date.js — viewport-aware flip:
 * opens below the anchor by default, flips above when space is insufficient.
 *
 * Range mode (opts.range = true):
 *   First click  → sets range start (highlighted).
 *   Hover        → previews the range with a faded highlight between start
 *                  and the hovered cell, mirroring air-datepicker's UX.
 *   Second click → completes the range; fires on_select(from, to) where
 *                  from/to are {year, month, day} objects (from ≤ to).
 *
 * Exposed as frappe_hijri.HijriPicker so both control files can reference it
 * without polluting window or relying on import order within the bundle.
 */
(function () {
	class HijriPicker {
		/**
		 * @param {object} opts
		 * @param {jQuery}   opts.$anchor      - The <input> the picker is anchored to
		 * @param {function} opts.on_select     - Single mode: called with (year, month, day)
		 *                                        Range  mode: called with ({year,month,day} from, to)
		 * @param {boolean}  [opts.range]       - Enable range selection (default: false)
		 * @param {string}   [opts.today_label] - Localised "Today" text (default: __("Today"))
		 * @param {function} [opts.can_write]   - Returns false to suppress opening (default: () => true)
		 */
		constructor({ $anchor, on_select, range, today_label, can_write } = {}) {
			this.$anchor = $anchor;
			this.on_select = on_select;
			this.range = !!range;
			this.can_write = can_write || (() => true);
			this.today_text = today_label || __("Today");

			this.$picker = null;
			this.current_view = "days";
			this.selected = null;
			this.current_year = null;
			this.current_month = null;

			// Range state
			this.range_start = null;
			this.range_end = null;
			this.range_hover = null;
			this.awaiting_end = false;

			// Unique namespace so concurrent pickers clean up independently
			this.event_ns = "hijri_picker_" + Math.random().toString(36).slice(2);

			this.outside_click_handler = (e) => {
				if (
					this.$picker?.is(":visible") &&
					!this.$picker.is(e.target) &&
					this.$picker.has(e.target).length === 0 &&
					!this.$anchor.is(e.target)
				) {
					this.hide();
				}
			};

			$(document).on("mousedown." + this.event_ns, this.outside_click_handler);
		}

		// ── Public API ──────────────────────────────────────────────────────────────

		/**
		 * Show the picker.
		 * @param {string|string[]} current_value
		 *   Single mode: "YYYY-MM-DD" string or falsy for today.
		 *   Range  mode: ["YYYY-MM-DD", "YYYY-MM-DD"] to restore a saved range,
		 *                or falsy/empty to start fresh.
		 */
		show(current_value) {
			if (!this.can_write()) return;

			if (!this.$picker) {
				this.$picker = $('<div class="hijri-dp" style="display:none">').appendTo(
					document.body
				);
			}

			let h;

			if (this.range && Array.isArray(current_value)) {
				// Restore saved range and open at the from-date month
				this.range_start = this.parse_stored(current_value[0]);
				this.range_end = this.parse_stored(current_value[1]);
				this.awaiting_end = false;
				this.range_hover = null;
				h = this.range_start || this.get_now_date();
			} else if (current_value && !Array.isArray(current_value)) {
				h = this.parse_stored(current_value) || this.get_now_date();
			} else {
				h = this.get_now_date();
			}

			this.current_year = h.year;
			this.current_month = h.month;
			this.selected = h;
			this.current_view = "days";
			this.render();
			this.set_position();
			this.$picker.show();
		}

		hide() {
			this.$picker?.hide();
		}

		destroy() {
			$(document).off("mousedown." + this.event_ns);
			this.$picker?.remove();
			this.$picker = null;
		}

		// ── Positioning ─────────────────────────────────────────────────────────────
		// Mirrors frappe/public/js/frappe/form/controls/date.js:
		//   check_and_set_date_picker_position()

		set_position() {
			if (!this.$picker) return;

			const el = this.$anchor[0];
			const rect = el.getBoundingClientRect();

			// Temporarily reveal (invisible) to measure height before final placement
			this.$picker.css({ visibility: "hidden", display: "block" });
			const picker_h = this.$picker.outerHeight() || 300;
			const picker_w = this.$picker.outerWidth() || 280;
			this.$picker.css({ visibility: "", display: "none" });

			const win_h = $(window).height();
			const win_w = $(window).width();
			const scroll_top = $(window).scrollTop();
			const scroll_left = $(window).scrollLeft();

			const anchor_top = rect.top + scroll_top;
			const anchor_left = rect.left + scroll_left;
			const anchor_h = el.offsetHeight;

			// Flip above when insufficient room below but enough above
			const space_below = win_h - rect.bottom;
			const top =
				space_below < picker_h && rect.top > picker_h
					? anchor_top - picker_h - 4
					: anchor_top + anchor_h + 4;

			// Clamp to right edge of viewport
			const left = Math.min(anchor_left, scroll_left + win_w - picker_w - 8);

			this.$picker.css({ position: "absolute", top: top + "px", left: left + "px" });
		}

		// ── Rendering ───────────────────────────────────────────────────────────────

		render() {
			if (this.current_view === "days") this.render_days();
			else if (this.current_view === "months") this.render_months();
			else this.render_years();
		}

		nav_html(title) {
			return `<div class="hijri-dp-nav">
				<div class="hijri-dp-nav-btn" data-action="prev">
					<svg class="icon icon-sm"><use href="#icon-left"></use></svg>
				</div>
				<div class="hijri-dp-nav-title">${title}</div>
				<div class="hijri-dp-nav-btn" data-action="next">
					<svg class="icon icon-sm"><use href="#icon-right"></use></svg>
				</div>
			</div>`;
		}

		footer_html() {
			return `<div class="hijri-dp-footer">
				<span class="hijri-dp-today" data-action="today">${this.today_text}</span>
			</div>`;
		}

		bind_nav(on_prev, on_next, on_title) {
			this.$picker.find('[data-action="prev"]').on("click", on_prev);
			this.$picker.find('[data-action="next"]').on("click", on_next);
			this.$picker.find(".hijri-dp-nav-title").on("click", on_title);
			this.$picker.find('[data-action="today"]').on("click", () => {
				const t = this.get_now_date();
				if (this.range) {
					// "Today" in range mode: set a same-day range and close
					this.range_start = t;
					this.range_end = t;
					this.awaiting_end = false;
					this.range_hover = null;
					this.on_select(t, t);
					this.hide();
				} else {
					this.select(t.year, t.month, t.day);
				}
			});
		}

		// ── Days view ───────────────────────────────────────────────────────────────

		render_days() {
			const hy = this.current_year,
				hm = this.current_month;
			const days = frappe_hijri.hijri.hijriMonthDays(hy, hm);
			const g1 = frappe_hijri.hijri.hijriToGregorian(hy, hm, 1);
			const dow = new Date(g1.year, g1.month - 1, g1.day).getDay();
			const ar = frappe_hijri.hijri.getMonthName(hm);
			const en = frappe_hijri.hijri.getMonthNameEn(hm);
			const use_ar = (frappe.boot?.lang || frappe.lang || "en").startsWith("ar");

			// Day-view header: full name, one language — mirrors "April, 2026"
			let html = this.nav_html(`${use_ar ? ar : en}, ${hy}`);
			const day_names = [
				__("Su"),
				__("Mo"),
				__("Tu"),
				__("We"),
				__("Th"),
				__("Fr"),
				__("Sa"),
			];
			html += `<div class="hijri-dp-days-names">${day_names
				.map((d) => `<div class="hijri-dp-dn">${d}</div>`)
				.join("")}</div>`;
			html += `<div class="hijri-dp-cells hijri-dp-cells-days">`;

			// Previous-month overflow
			let prev_month = hm - 1,
				prev_year = hy;
			if (prev_month < 1) {
				prev_month = 12;
				prev_year--;
			}
			const prev_days = frappe_hijri.hijri.hijriMonthDays(prev_year, prev_month);
			for (let i = dow - 1; i >= 0; i--) {
				const d = prev_days - i;
				html += `<div class="hijri-dp-cell hijri-dp-day -other-"
					data-pday="${d}" data-pmonth="${prev_month}" data-pyear="${prev_year}">${d}</div>`;
			}

			const today = this.get_now_date();
			// Resolve the effective range for highlight calculations
			const { r_low, r_high } = this.range_bounds();

			for (let d = 1; d <= days; d++) {
				let cls = "hijri-dp-cell hijri-dp-day";
				if (hy === today.year && hm === today.month && d === today.day) cls += " -cur-";

				if (this.range) {
					cls += this.range_cell_classes(hy, hm, d, r_low, r_high);
				} else {
					const sel = this.selected;
					if (sel && hy === sel.year && hm === sel.month && d === sel.day) cls += " -sel-";
				}

				html += `<div class="${cls}" data-day="${d}">${d}</div>`;
			}

			// Next-month overflow to fill last row
			const total_cells = dow + days;
			const remaining = total_cells % 7 === 0 ? 0 : 7 - (total_cells % 7);
			let next_month = hm + 1,
				next_year = hy;
			if (next_month > 12) {
				next_month = 1;
				next_year++;
			}
			for (let d = 1; d <= remaining; d++) {
				html += `<div class="hijri-dp-cell hijri-dp-day -other-"
					data-nday="${d}" data-nmonth="${next_month}" data-nyear="${next_year}">${d}</div>`;
			}

			html += `</div>`;
			html += this.footer_html();
			this.$picker.html(html);

			if (this.range) {
				this.bind_days_range(hy, hm);
			} else {
				this.bind_days_single(hy, hm, prev_year, prev_month, next_year, next_month);
			}

			this.bind_nav(
				() => {
					this.range_hover = null;
					if (--this.current_month < 1) {
						this.current_month = 12;
						this.current_year--;
					}
					this.render();
				},
				() => {
					this.range_hover = null;
					if (++this.current_month > 12) {
						this.current_month = 1;
						this.current_year++;
					}
					this.render();
				},
				() => {
					this.current_view = "months";
					this.render();
				}
			);
		}

		// Single-mode click handlers (unchanged behaviour)
		bind_days_single(hy, hm, prev_year, prev_month, next_year, next_month) {
			this.$picker.find(".hijri-dp-day:not(.-other-)").on("click", (e) => {
				this.select(hy, hm, parseInt($(e.currentTarget).data("day")));
			});
			this.$picker.find(".hijri-dp-day[data-pday]").on("click", (e) => {
				const el = $(e.currentTarget);
				this.current_year = prev_year;
				this.current_month = prev_month;
				this.select(prev_year, prev_month, parseInt(el.data("pday")));
			});
			this.$picker.find(".hijri-dp-day[data-nday]").on("click", (e) => {
				const el = $(e.currentTarget);
				this.current_year = next_year;
				this.current_month = next_month;
				this.select(next_year, next_month, parseInt(el.data("nday")));
			});
		}

		// Range-mode click + hover handlers
		bind_days_range(hy, hm) {
			const $days = this.$picker.find(".hijri-dp-day:not(.-other-)");

			$days.on("click", (e) => {
				const d = parseInt($(e.currentTarget).data("day"));
				const clicked = { year: hy, month: hm, day: d };

				if (!this.awaiting_end) {
					// First click — select range start
					this.range_start = clicked;
					this.range_end = null;
					this.range_hover = null;
					this.awaiting_end = true;
					this.update_range_highlight(hy, hm);
				} else {
					// Second click — complete the range
					let from = this.range_start,
						to = clicked;
					if (this.cmp_date(from, to) > 0) {
						[from, to] = [to, from];
					}
					this.range_start = from;
					this.range_end = to;
					this.awaiting_end = false;
					this.range_hover = null;
					this.on_select(from, to);
					this.hide();
				}
			});

			// Always bind hover events — guard with awaiting_end check inside the
			// handler.  Binding conditionally at render time does not work because
			// awaiting_end is always false when render_days() runs.
			$days.on("mouseover", (e) => {
				if (!this.awaiting_end) return;
				const d = parseInt($(e.currentTarget).data("day"));
				this.range_hover = { year: hy, month: hm, day: d };
				this.update_range_highlight(hy, hm);
			});
			this.$picker.find(".hijri-dp-cells-days").on("mouseleave", () => {
				if (!this.awaiting_end || !this.range_hover) return;
				this.range_hover = null;
				this.update_range_highlight(hy, hm);
			});
		}

		// Update only cell classes — no DOM teardown, safe to call on every hover
		update_range_highlight(hy, hm) {
			const { r_low, r_high } = this.range_bounds();
			this.$picker.find(".hijri-dp-day:not(.-other-)").each((_, el) => {
				const $el = $(el);
				const d = parseInt($el.data("day"));
				$el.removeClass("-sel- -range-start- -range-end- -range-");
				const extra = this.range_cell_classes(hy, hm, d, r_low, r_high);
				if (extra) $el.addClass(extra.trim());
			});
		}

		// Returns the extra class string for a range-mode day cell
		range_cell_classes(hy, hm, d, r_low, r_high) {
			const rs = this.range_start;
			// Only start selected, no end yet
			if (rs && !r_high) {
				if (hy === rs.year && hm === rs.month && d === rs.day) return " -range-start-";
				return "";
			}
			if (!r_low || !r_high) return "";

			const cell = { year: hy, month: hm, day: d };
			const is_start = hy === r_low.year && hm === r_low.month && d === r_low.day;
			const is_end = hy === r_high.year && hm === r_high.month && d === r_high.day;
			const in_range =
				this.cmp_date(cell, r_low) > 0 && this.cmp_date(cell, r_high) < 0;

			let cls = "";
			if (is_start) cls += " -range-start-";
			if (is_end) cls += " -range-end-";
			if (in_range) cls += " -range-";
			return cls;
		}

		// Returns normalised { r_low, r_high } — always r_low ≤ r_high
		range_bounds() {
			const rs = this.range_start;
			const re = this.range_end || this.range_hover;
			if (!rs || !re) return { r_low: rs || null, r_high: re || null };
			return this.cmp_date(rs, re) <= 0
				? { r_low: rs, r_high: re }
				: { r_low: re, r_high: rs };
		}

		// ── Months view ─────────────────────────────────────────────────────────────

		render_months() {
			const hy = this.current_year;
			let html = this.nav_html(`${hy}`);
			html += `<div class="hijri-dp-cells hijri-dp-cells-months">`;
			const sel = this.selected,
				today = this.get_now_date();
			const use_ar = (frappe.boot?.lang || frappe.lang || "en").startsWith("ar");
			for (let m = 1; m <= 12; m++) {
				let cls = "hijri-dp-cell hijri-dp-month";
				if (sel && hy === sel.year && m === sel.month) cls += " -sel-";
				if (hy === today.year && m === today.month) cls += " -cur-";
				const label = use_ar
					? frappe_hijri.hijri.getMonthName(m)
					: frappe_hijri.hijri.getMonthNameShort(m);
				html += `<div class="${cls}" data-month="${m}">${label}</div>`;
			}
			html += `</div>`;
			html += this.footer_html();
			this.$picker.html(html);

			this.$picker.find(".hijri-dp-month").on("click", (e) => {
				this.current_month = parseInt($(e.currentTarget).data("month"));
				this.current_view = "days";
				this.render();
			});
			this.bind_nav(
				() => {
					this.current_year--;
					this.render();
				},
				() => {
					this.current_year++;
					this.render();
				},
				() => {
					this.current_view = "years";
					this.render();
				}
			);
		}

		// ── Years view ──────────────────────────────────────────────────────────────

		render_years() {
			const hy = this.current_year;
			const decade_start = hy - (hy % 10),
				decade_end = decade_start + 9;
			let html = this.nav_html(`${decade_start} – ${decade_end}`);
			html += `<div class="hijri-dp-cells hijri-dp-cells-years">`;
			const sel = this.selected,
				today = this.get_now_date();
			for (let y = decade_start - 1; y <= decade_end + 1; y++) {
				let cls = "hijri-dp-cell hijri-dp-year";
				if (y < decade_start || y > decade_end) cls += " -other-";
				if (sel && y === sel.year) cls += " -sel-";
				if (y === today.year) cls += " -cur-";
				html += `<div class="${cls}" data-year="${y}">${y}</div>`;
			}
			html += `</div>`;
			html += this.footer_html();
			this.$picker.html(html);

			this.$picker.find(".hijri-dp-year").on("click", (e) => {
				this.current_year = parseInt($(e.currentTarget).data("year"));
				this.current_view = "months";
				this.render();
			});
			this.bind_nav(
				() => {
					this.current_year -= 10;
					this.render();
				},
				() => {
					this.current_year += 10;
					this.render();
				},
				() => {} // top-level — no further zoom out
			);
		}

		// ── Selection (single mode) ──────────────────────────────────────────────────

		select(hy, hm, hd) {
			this.selected = { year: hy, month: hm, day: hd };
			this.on_select(hy, hm, hd);
			this.hide();
		}

		// ── Helpers ─────────────────────────────────────────────────────────────────

		// get_now_date mirrors ControlDate.get_now_date (date.js:138)
		get_now_date() {
			const now = new Date();
			return frappe_hijri.hijri.gregorianToHijri(
				now.getFullYear(),
				now.getMonth() + 1,
				now.getDate()
			);
		}

		// Parse a stored "YYYY-MM-DD" string into {year, month, day} or null
		parse_stored(value) {
			if (!value) return null;
			const parts = String(value).split("-").map(Number);
			if (parts.length === 3 && !isNaN(parts[0]) && parts[0] > 31) {
				return { year: parts[0], month: parts[1], day: parts[2] };
			}
			return null;
		}

		// Compare two {year, month, day} objects — negative if a < b, 0 if equal, positive if a > b
		cmp_date(a, b) {
			if (a.year !== b.year) return a.year - b.year;
			if (a.month !== b.month) return a.month - b.month;
			return a.day - b.day;
		}
	}

	// Expose on the frappe_hijri namespace — created by hijri_utils.js which
	// is imported first in the bundle.  Not on frappe.ui.form because
	// HijriPicker is not a Frappe control, it is an internal UI helper.
	frappe_hijri.HijriPicker = HijriPicker;
})();
