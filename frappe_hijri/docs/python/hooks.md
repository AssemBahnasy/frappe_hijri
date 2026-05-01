# Hooks

**File:** `frappe_hijri/hooks.py`

## Active Hooks

| Hook | Value | Purpose |
|------|-------|---------|
| `app_include_js` | `"frappe_hijri.bundle.js"` | Loads compiled JS bundle on every desk page |
| `app_include_css` | `"/assets/frappe_hijri/css/hijri_datepicker.css"` | Loads datepicker styles |
| `before_app_install` | `["frappe_hijri.ensure_hijri_type_map_for_install"]` | Patches type map before `sync_for` during `bench install-app` |
| `before_migrate` | `["frappe_hijri.register_hijri_date_type_map"]` | Patches type map and DocField meta before `bench migrate` |
| `before_request` | `["frappe_hijri.register_hijri_date_type_map"]` | Re-patches on every HTTP request |
| `extend_bootinfo` | `"frappe_hijri.boot.extend_bootinfo"` | Sends `hijri_date_format` to the browser in the boot response |

---

## Notes

**`app_include_js` uses the short bundle name** — Frappe resolves `frappe_hijri.bundle.js` to the hashed file in `dist/` at runtime (e.g. `frappe_hijri.bundle.KVWVGA2X.js`). Using the source path would serve the raw 7-line entry file instead of the compiled bundle.

**`app_include_css` uses the full asset path** — CSS files are served directly and are not processed by esbuild. The `/assets/` prefix is required.

**`before_app_install` is the install entry point** — `bench install-app` never fires `before_migrate`. This is the only hook that runs before database tables are created during an install.

**`before_request` is idempotent** — each of the patches it triggers checks a sentinel before doing any work, so repeated calls within a process are effectively free.
