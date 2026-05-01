// Import order is load-order critical — each file depends on the one above it.

// 1. Conversion utilities — creates window.frappe_hijri.hijri namespace.
//    Everything else depends on this.
import "./utils/hijri_utils.js";

// 2. Shared picker UI — creates window._HijriPicker.
//    Must follow hijri_utils (picker calls frappe_hijri.hijri.*).
import "./controls/hijri_picker.js";

// 3. Read-only display formatter — depends on frappe_hijri.hijri.formatHijriDate.
//    Registered before any form renders so submitted documents display correctly.
//    Mirrors frappe/public/js/frappe/form/formatters.js registration pattern.
import "./formatters.js";

// 4. Single-date control — depends on _HijriPicker.
//    Mirrors frappe/public/js/frappe/form/controls/date.js.
import "./controls/hijri_date.js";

// 5. Date-range control — depends on _HijriPicker.
//    Used by the filter system when condition is "Between".
//    Mirrors frappe/public/js/frappe/form/controls/date_range.js.
import "./controls/hijri_date_range.js";

// 6. Form Builder patch — depends on ControlHijriDate being registered above.
//    Mirrors the lazy-load interception pattern used by other community apps.
import "./form_builder_patch.js";

// 7. Filter patch — depends on frappe.ui.Filter (Frappe core bundle, always
//    loaded before app bundles) and ControlHijriDateRange (step 5 above).
//    Mirrors frappe/public/js/frappe/ui/filters/filter.js integration.
import "./ui/filters/hijri_filter_patch.js";
