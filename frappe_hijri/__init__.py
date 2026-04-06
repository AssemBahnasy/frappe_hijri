__version__ = "0.0.1"

import frappe


def _register_hijri_date_fieldtype():
    """Register 'Hijri Date' so Frappe treats it as a data-bearing field.

    We must patch every module that has already done
    ``from frappe.model import data_fieldtypes`` because Python binds the
    *old* tuple to their local name and won't see a replacement on
    ``frappe.model``.
    """
    if "Hijri Date" in frappe.model.data_fieldtypes:
        return

    new_tuple = (*frappe.model.data_fieldtypes, "Hijri Date")
    frappe.model.data_fieldtypes = new_tuple

    import sys

    for mod_name in (
        "frappe.model.meta",
        "frappe.model.create_new",
        "frappe.core.report.permitted_documents_for_user.permitted_documents_for_user",
    ):
        mod = sys.modules.get(mod_name)
        if mod and hasattr(mod, "data_fieldtypes"):
            mod.data_fieldtypes = new_tuple


def register_hijri_date_type_map():
    """Add 'Hijri Date' to frappe.db.type_map so it maps to a varchar(10) column."""
    _register_hijri_date_fieldtype()
    if frappe.db and hasattr(frappe.db, "type_map") and "Hijri Date" not in frappe.db.type_map:
        frappe.db.type_map["Hijri Date"] = ("varchar", 10)
    _patch_docfield_fieldtype_options()


def _patch_docfield_fieldtype_options():
    """Add 'Hijri Date' to the DocField 'fieldtype' Select options.

    DocField is a 'special' doctype in Frappe — property setters are never
    applied to it (see Meta.process).  We must patch the cached meta directly
    so that _validate_selects() accepts 'Hijri Date' as a valid fieldtype.
    """
    try:
        meta = frappe.get_meta("DocField")
    except Exception:
        return

    for field in meta.fields:
        if field.fieldname == "fieldtype":
            options = (field.options or "").split("\n")
            if "Hijri Date" not in options:
                options.append("Hijri Date")
                field.options = "\n".join(options)
            break


_register_hijri_date_fieldtype()


def get_hijri_date_format():
    """Return the configured Hijri date format, defaulting to yyyy-mm-dd."""
    try:
        fmt = frappe.db.get_single_value("Hijri Settings", "date_format")
    except Exception:
        fmt = None
    return fmt or "yyyy-mm-dd"
