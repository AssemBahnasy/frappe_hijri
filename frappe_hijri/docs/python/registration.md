# Python: Fieldtype Registration

**File:** `frappe_hijri/__init__.py`

Runs at import time and patches four Frappe internals to make `"Hijri Date"` behave identically to built-in fieldtypes.

---

## `_patch_mariadb_class()`

Wraps `MariaDBDatabase.setup_type_map` at the **class level**:

```python
def _patch_mariadb_class():
    from frappe.database.mariadb.database import MariaDBDatabase
    if getattr(MariaDBDatabase, "_hijri_type_map_patched", False):
        return
    _original = MariaDBDatabase.setup_type_map
    def _patched(self):
        _original(self)
        self.type_map["Hijri Date"] = ("varchar", 10)
    MariaDBDatabase.setup_type_map = _patched
    MariaDBDatabase._hijri_type_map_patched = True
```

**Why class-level:** `Database.__init__()` calls `self.setup_type_map()`, which assigns a brand-new `dict` to `self.type_map`. Any instance-level patch (e.g. modifying `frappe.db.type_map` directly) is discarded when a new DB connection is made. The class-level wrap survives reconnects.

| Scenario | Instance patch | Class-level patch |
|----------|---------------|-------------------|
| `bench migrate` | ✅ | ✅ |
| `bench install-app` (`before_migrate` never fires) | ❌ | ✅ |
| DB reconnect mid-process | ❌ | ✅ |

---

## `_register_hijri_date_fieldtype()`

Appends `"Hijri Date"` to `frappe.model.data_fieldtypes` and updates all modules that have cached the original tuple via `from frappe.model import data_fieldtypes`. Python's `from X import Y` binds the name to the original tuple object — replacing the tuple on `frappe.model` alone does not update these references.

| Module updated | Why |
|----------------|-----|
| `frappe.model.meta` | `Meta.process()` validates fieldtypes against this tuple |
| `frappe.model.create_new` | `get_new_doc()` checks data-bearing fields |
| `frappe.core.report.permitted_documents_for_user` | Permission filtering |

---

## `_patch_docfield_fieldtype_options()`

DocField is a "special doctype" — Frappe skips `apply_property_setters()` for it, so Property Setters cannot extend the `fieldtype` Select options. This function patches the **cached meta object** directly:

```python
meta = frappe.get_meta("DocField")
for field in meta.fields:
    if field.fieldname == "fieldtype":
        options = (field.options or "").split("\n")
        if "Hijri Date" not in options:
            options.append("Hijri Date")
            field.options = "\n".join(options)
        break
```

Without this patch, saving a DocType with a `"Hijri Date"` field would raise a validation error ("Type cannot be Hijri Date").

Called on every request because Frappe may rebuild the meta cache between requests.

---

## `register_hijri_date_type_map()`

Public function called by `before_request` and `before_migrate` hooks. Chains the three patches above in sequence. Also calls `patch_format_value()` from `frappe_hijri.utils.formatters`.

Acts as a safety net for the current process's `frappe.db` instance.

---

## `ensure_hijri_type_map_for_install(app_name)`

Called by the `before_app_install` hook during `bench install-app`. Ignores `app_name` — its only job is to call `register_hijri_date_type_map()` before Frappe runs `sync_for()` for the app being installed.

`bench install-app` never fires `before_migrate`, making this hook the only mechanism that guarantees the type map is set before database tables are created.

---

## `get_hijri_date_format()`

Reads `date_format` from Hijri Settings (Single DocType). Returns `"yyyy-mm-dd"` as default. Used by `boot.py`.
