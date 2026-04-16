__version__ = "0.0.1"

import frappe


# ---------------------------------------------------------------------------
# Core fix: patch MariaDBDatabase at the CLASS level
# ---------------------------------------------------------------------------
# Root cause: Database.__init__() calls self.setup_type_map() which creates
# a fresh new dict for self.type_map on EVERY instance.  Any approach that
# adds "Hijri Date" to an existing frappe.db instance is fragile — it works
# for the current bench migrate run, but breaks during bench install-app
# (where before_migrate never fires) and on any reconnect.
#
# The fix: wrap setup_type_map() on the class itself so that every future
# MariaDBDatabase instance — whether created during install, migrate, or a
# web request — always includes "Hijri Date" in its type_map.
# ---------------------------------------------------------------------------


def _patch_mariadb_class():
    """Wrap setup_type_map at the class level for ALL MariaDB implementations.

    Frappe ships two separate MariaDBDatabase classes:
      - frappe.database.mariadb.database.MariaDBDatabase  (PyMySQL driver)
      - frappe.database.mariadb.mysqlclient.MariaDBDatabase (mysqlclient / default)

    get_db() uses the mysqlclient variant when ``use_mysqlclient=1`` (the default).
    Both classes have their own independent setup_type_map() so we must patch
    each one explicitly.

    Idempotent: the sentinel attribute _hijri_type_map_patched prevents
    double-wrapping if this module is somehow imported twice.
    """

    def _apply_patch(cls):
        if getattr(cls, "_hijri_type_map_patched", False):
            return
        _original = cls.setup_type_map

        def _patched_setup_type_map(self):
            _original(self)
            self.type_map["Hijri Date"] = ("varchar", 10)

        cls.setup_type_map = _patched_setup_type_map
        cls._hijri_type_map_patched = True

    # Patch the standard PyMySQL-backed driver
    try:
        from frappe.database.mariadb.database import MariaDBDatabase as _StdMariaDB
        _apply_patch(_StdMariaDB)
    except ImportError:
        pass

    # Patch the mysqlclient-backed driver (used by default when use_mysqlclient=1)
    try:
        from frappe.database.mariadb.mysqlclient import MariaDBDatabase as _MysqlclientMariaDB
        _apply_patch(_MysqlclientMariaDB)
    except ImportError:
        pass


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
    """Register 'Hijri Date' in both frappe.db.type_map and data_fieldtypes.

    Called via before_migrate and before_request hooks as an additional safety
    net.  The class-level patch in _patch_mariadb_class() is the primary fix
    and handles all new instances; this function patches the *current* instance
    in case it was constructed before our module was first imported.
    """
    _register_hijri_date_fieldtype()
    # Patch current instance (created before our class-level patch ran)
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


# ---------------------------------------------------------------------------
# Module-level initialization — runs once when frappe_hijri is first imported
# ---------------------------------------------------------------------------

# 1. Patch the class so ALL future MariaDBDatabase instances include Hijri Date.
_patch_mariadb_class()

# 2. Patch the *current* frappe.db instance if it already exists.
if frappe.db and hasattr(frappe.db, "type_map") and "Hijri Date" not in frappe.db.type_map:
    frappe.db.type_map["Hijri Date"] = ("varchar", 10)

# 3. Register Hijri Date as a Frappe model data fieldtype.
_register_hijri_date_fieldtype()


def ensure_hijri_type_map_for_install(app_name):
    """Called by before_app_install hook before any app's sync_for runs.

    This is the primary entry point for bench install-app scenarios.
    `before_migrate` does NOT fire during install-app, so this hook is the
    only reliable way to set the type_map before schema sync.
    """
    register_hijri_date_type_map()


def get_hijri_date_format():
    """Return the configured Hijri date format, defaulting to yyyy-mm-dd."""
    try:
        fmt = frappe.db.get_single_value("Hijri Settings", "date_format")
    except Exception:
        fmt = None
    return fmt or "yyyy-mm-dd"
