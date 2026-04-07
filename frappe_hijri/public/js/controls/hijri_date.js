/**
 * Hijri Date Control for Frappe
 *
 * Extends ControlData (NOT ControlDate) to avoid air-datepicker conflicts.
 * Stores Hijri date directly as YYYY-MM-DD string (e.g. "1447-10-07").
 * DB column is varchar(10).
 *
 * Three-level navigation: Days → Months → Years.
 */
frappe.ui.form.ControlHijriDate = class ControlHijriDate extends frappe.ui.form.ControlData {
    static trigger_change_on_input_event = false;

    make_input() {
        super.make_input();
        this.today_text = __("Today");
        this._setup_picker();
    }

    _setup_picker() {
        this.$input.on("focus", () => this._show());
        this.$input.on("keydown", (e) => {
            if (e.key === "Escape") this._hide();
            if (e.key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                let t = this._today();
                this._select(t.year, t.month, t.day);
                return false;
            }
        });
        this._outsideClickHandler = (e) => {
            if (
                this.$picker &&
                this.$picker.is(":visible") &&
                !this.$picker.is(e.target) &&
                this.$picker.has(e.target).length === 0 &&
                !this.$input.is(e.target)
            ) {
                this._hide();
            }
        };
        $(document).on("mousedown", this._outsideClickHandler);
    }

    _today() {
        let now = new Date();
        return frappe_hijri.hijri.gregorianToHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    _show() {
        if (!this.can_write()) return;
        if (!this.$picker) {
            this.$picker = $('<div class="hijri-dp"></div>').appendTo(this.input_area);
        }
        let val = this.get_value();
        let h;
        if (val) {
            let p = val.split("-").map(Number);
            if (p.length === 3 && !isNaN(p[0])) {
                h = { year: p[0], month: p[1], day: p[2] };
            } else {
                h = this._today();
            }
        } else {
            h = this._today();
        }
        this._yr = h.year;
        this._mo = h.month;
        this._sel = h;
        this._view = "days";
        this._render();
        this.$picker.show();
    }

    _hide() {
        if (this.$picker) this.$picker.hide();
    }

    // ── Rendering ──

    _render() {
        if (this._view === "days") this._renderDays();
        else if (this._view === "months") this._renderMonths();
        else this._renderYears();
    }

    _nav(title) {
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

    _footer() {
        return `<div class="hijri-dp-footer">
			<span class="hijri-dp-today" data-action="today">${this.today_text}</span>
		</div>`;
    }

    _bindNav(prev, next, title) {
        this.$picker.find('[data-action="prev"]').on("click", prev);
        this.$picker.find('[data-action="next"]').on("click", next);
        this.$picker.find(".hijri-dp-nav-title").on("click", title);
        this.$picker.find('[data-action="today"]').on("click", () => {
            let t = this._today();
            this._select(t.year, t.month, t.day);
        });
    }

    // ── Days ──

    _renderDays() {
        let hy = this._yr, hm = this._mo;
        let days = frappe_hijri.hijri.hijriMonthDays(hy, hm);
        let g1 = frappe_hijri.hijri.hijriToGregorian(hy, hm, 1);
        let dow = new Date(g1.year, g1.month - 1, g1.day).getDay();
        let ar = frappe_hijri.hijri.getMonthName(hm);
        let en = frappe_hijri.hijri.getMonthNameEn(hm);

        let html = this._nav(`${ar} ${en}, ${hy}`);
        const dn = [__("Su"), __("Mo"), __("Tu"), __("We"), __("Th"), __("Fr"), __("Sa")];
        html += `<div class="hijri-dp-days-names">${dn.map(d => `<div class="hijri-dp-dn">${d}</div>`).join("")}</div>`;
        html += `<div class="hijri-dp-cells hijri-dp-cells-days">`;

        // Previous month overflow days
        let prevMonth = hm - 1, prevYear = hy;
        if (prevMonth < 1) { prevMonth = 12; prevYear--; }
        let prevDays = frappe_hijri.hijri.hijriMonthDays(prevYear, prevMonth);
        for (let i = dow - 1; i >= 0; i--) {
            let d = prevDays - i;
            html += `<div class="hijri-dp-cell hijri-dp-day -other-" data-pday="${d}" data-pmonth="${prevMonth}" data-pyear="${prevYear}">${d}</div>`;
        }

        let sel = this._sel, td = this._today();
        for (let d = 1; d <= days; d++) {
            let c = "hijri-dp-cell hijri-dp-day";
            if (sel && hy === sel.year && hm === sel.month && d === sel.day) c += " -sel-";
            if (hy === td.year && hm === td.month && d === td.day) c += " -cur-";
            html += `<div class="${c}" data-day="${d}">${d}</div>`;
        }

        // Next month overflow days to fill remaining cells
        let totalCells = dow + days;
        let remaining = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
        let nextMonth = hm + 1, nextYear = hy;
        if (nextMonth > 12) { nextMonth = 1; nextYear++; }
        for (let d = 1; d <= remaining; d++) {
            html += `<div class="hijri-dp-cell hijri-dp-day -other-" data-nday="${d}" data-nmonth="${nextMonth}" data-nyear="${nextYear}">${d}</div>`;
        }

        html += `</div>`;
        html += this._footer();
        this.$picker.html(html);

        this.$picker.find(".hijri-dp-day:not(.-other-)").on("click", (e) => {
            this._select(hy, hm, parseInt($(e.currentTarget).data("day")));
        });
        // Click on previous month overflow day
        this.$picker.find(".hijri-dp-day[data-pday]").on("click", (e) => {
            let el = $(e.currentTarget);
            this._yr = parseInt(el.data("pyear"));
            this._mo = parseInt(el.data("pmonth"));
            this._select(this._yr, this._mo, parseInt(el.data("pday")));
        });
        // Click on next month overflow day
        this.$picker.find(".hijri-dp-day[data-nday]").on("click", (e) => {
            let el = $(e.currentTarget);
            this._yr = parseInt(el.data("nyear"));
            this._mo = parseInt(el.data("nmonth"));
            this._select(this._yr, this._mo, parseInt(el.data("nday")));
        });
        this._bindNav(
            () => { if (--this._mo < 1) { this._mo = 12; this._yr--; } this._render(); },
            () => { if (++this._mo > 12) { this._mo = 1; this._yr++; } this._render(); },
            () => { this._view = "months"; this._render(); }
        );
    }

    // ── Months ──

    _renderMonths() {
        let hy = this._yr;
        let html = this._nav(`${hy}`);
        html += `<div class="hijri-dp-cells hijri-dp-cells-months">`;
        let sel = this._sel, td = this._today();
        for (let m = 1; m <= 12; m++) {
            let c = "hijri-dp-cell hijri-dp-month";
            if (sel && hy === sel.year && m === sel.month) c += " -sel-";
            if (hy === td.year && m === td.month) c += " -cur-";
            html += `<div class="${c}" data-month="${m}">
				<span class="hijri-dp-mar">${frappe_hijri.hijri.getMonthName(m)}</span>
				<span class="hijri-dp-men">${frappe_hijri.hijri.getMonthNameEn(m)}</span>
			</div>`;
        }
        html += `</div>`;
        html += this._footer();
        this.$picker.html(html);

        this.$picker.find(".hijri-dp-month").on("click", (e) => {
            this._mo = parseInt($(e.currentTarget).data("month"));
            this._view = "days";
            this._render();
        });
        this._bindNav(
            () => { this._yr--; this._render(); },
            () => { this._yr++; this._render(); },
            () => { this._view = "years"; this._render(); }
        );
    }

    // ── Years ──

    _renderYears() {
        let hy = this._yr;
        let ds = hy - (hy % 10), de = ds + 9;
        let html = this._nav(`${ds} - ${de}`);
        html += `<div class="hijri-dp-cells hijri-dp-cells-years">`;
        let sel = this._sel, td = this._today();
        for (let y = ds - 1; y <= de + 1; y++) {
            let c = "hijri-dp-cell hijri-dp-year";
            if (y < ds || y > de) c += " -other-";
            if (sel && y === sel.year) c += " -sel-";
            if (y === td.year) c += " -cur-";
            html += `<div class="${c}" data-year="${y}">${y}</div>`;
        }
        html += `</div>`;
        html += this._footer();
        this.$picker.html(html);

        this.$picker.find(".hijri-dp-year").on("click", (e) => {
            this._yr = parseInt($(e.currentTarget).data("year"));
            this._view = "months";
            this._render();
        });
        this._bindNav(
            () => { this._yr -= 10; this._render(); },
            () => { this._yr += 10; this._render(); },
            () => { } // top level
        );
    }

    // ── Value ──

    _select(hy, hm, hd) {
        let s = `${hy}-${String(hm).padStart(2, "0")}-${String(hd).padStart(2, "0")}`;
        this._sel = { year: hy, month: hm, day: hd };
        this.set_value(s);
        this._hide();
    }

    get_value() {
        return this.value || "";
    }

    format_for_input(value) {
        return frappe_hijri.hijri.formatHijriDate(value);
    }

    parse(value) {
        if (!value) return "";
        // Check if already in system format YYYY-MM-DD (year > 31 distinguishes from dd-...)
        let parts = value.split("-").map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && parts[0] > 31 && parts[1] >= 1 && parts[1] <= 12 && parts[2] >= 1) {
            let maxDay = frappe_hijri.hijri.hijriMonthDays(parts[0], parts[1]);
            if (parts[2] <= maxDay) {
                return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
            }
        }
        // Try parsing from user display format
        let sys = frappe_hijri.hijri.parseHijriDate(value);
        if (!sys) return "";
        let p = sys.split("-").map(Number);
        if (p[1] < 1 || p[1] > 12 || p[2] < 1) return "";
        let maxDay = frappe_hijri.hijri.hijriMonthDays(p[0], p[1]);
        if (p[2] > maxDay) return "";
        return sys;
    }

    set_formatted_input(value) {
        if (this.$input) this.$input.val(this.format_for_input(value));
    }

    validate(value) {
        if (!value) return "";
        let p = value.split("-").map(Number);
        if (p.length !== 3 || isNaN(p[0]) || p[1] < 1 || p[1] > 12 || p[2] < 1) {
            let fmt = frappe_hijri.hijri.getDateFormat();
            frappe.msgprint(__("Hijri Date must be in format: {0}", [fmt]));
            return "";
        }
        let maxDay = frappe_hijri.hijri.hijriMonthDays(p[0], p[1]);
        if (p[2] > maxDay) {
            frappe.msgprint(__("{0} has only {1} days in month {2}", [p[0], maxDay, p[1]]));
            return "";
        }
        return value;
    }

    destroy() {
        if (this._outsideClickHandler) {
            $(document).off("mousedown", this._outsideClickHandler);
        }
        super.destroy();
    }
};
