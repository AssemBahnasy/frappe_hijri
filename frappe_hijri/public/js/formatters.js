// Formatter for read-only display of Hijri Date fields
frappe.form.formatters.HijriDate = function (value) {
    if (!value) return "";
    if (frappe_hijri?.hijri?.formatHijriDate) {
        return frappe_hijri.hijri.formatHijriDate(value);
    }
    return value;
};
