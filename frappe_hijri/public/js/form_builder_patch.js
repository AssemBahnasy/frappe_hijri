/**
 * Patch Frappe's Form Builder to register HijriDateControl.
 *
 * The form builder is a Vue app loaded lazily. Its component registry
 * (globals.js) doesn't know about custom fieldtypes. We intercept
 * frappe.ui.FormBuilder and wrap setup_app() so that "HijriDateControl"
 * is registered as a Vue component (mapped to a simple DataControl-like
 * template) before the app mounts.
 */
(function () {
    const HijriDateControl = {
        props: ["df", "value", "read_only"],
        template: `
			<div class="control frappe-control" :class="{ editable: $slots.label }">
				<div v-if="$slots.label" class="field-controls">
					<slot name="label" />
					<slot name="actions" />
				</div>
				<div v-else class="control-label label" :class="{ reqd: df.reqd }">{{ __(df.label) }}</div>
				<input class="form-control" type="text" :value="value"
					:disabled="read_only || df.read_only" readonly />
				<div v-if="df.description" class="mt-2 description" v-html="__(df.description)" />
			</div>
		`,
    };

    function patchFormBuilder(FormBuilder) {
        const origSetupApp = FormBuilder.prototype.setup_app;
        FormBuilder.prototype.setup_app = function () {
            origSetupApp.call(this);
            if (this.$form_builder && this.$form_builder.$) {
                this.$form_builder.$.appContext.app.component(
                    "HijriDateControl",
                    HijriDateControl
                );
            }
        };
    }

    frappe.provide("frappe.ui");

    // Register "Hijri Date" in frappe.model.all_fieldtypes so it appears
    // in the "Add Field" autocomplete dialog.
    if (
        frappe.model &&
        Array.isArray(frappe.model.all_fieldtypes) &&
        !frappe.model.all_fieldtypes.includes("Hijri Date")
    ) {
        frappe.model.all_fieldtypes.push("Hijri Date");
    }

    let _FormBuilder = frappe.ui.FormBuilder;

    if (_FormBuilder) {
        patchFormBuilder(_FormBuilder);
    } else {
        Object.defineProperty(frappe.ui, "FormBuilder", {
            configurable: true,
            enumerable: true,
            get() {
                return _FormBuilder;
            },
            set(val) {
                _FormBuilder = val;
                if (val) {
                    patchFormBuilder(val);
                }
            },
        });
    }
})();
