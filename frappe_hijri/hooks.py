app_name = "frappe_hijri"
app_title = "Frappe Hijri"
app_publisher = "AssemBahnasy"
app_description = "An app that incorporates the Hijri Islamic calendar as a new date field in Frappe framework"
app_email = "bahnasyassem@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Includes in <head>
# ------------------

app_include_js = "frappe_hijri.bundle.js"
app_include_css = "/assets/frappe_hijri/css/hijri_datepicker.css"

# include js, css files in header of web template
# web_include_css = "/assets/frappe_hijri/css/frappe_hijri.css"
# web_include_js = "/assets/frappe_hijri/js/frappe_hijri.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "frappe_hijri/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "frappe_hijri/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "frappe_hijri.utils.jinja_methods",
# 	"filters": "frappe_hijri.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "frappe_hijri.install.before_install"
# after_install = "frappe_hijri.install.after_install"

# Migration
# ---------

before_migrate = ["frappe_hijri.register_hijri_date_type_map"]

# Boot
# ----
extend_bootinfo = "frappe_hijri.boot.extend_bootinfo"

# Uninstallation
# ------------

# before_uninstall = "frappe_hijri.uninstall.before_uninstall"
# after_uninstall = "frappe_hijri.uninstall.after_uninstall"

# Request Events
# ----------------
before_request = ["frappe_hijri.register_hijri_date_type_map"]

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "frappe_hijri.utils.before_app_install"
# after_app_install = "frappe_hijri.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "frappe_hijri.utils.before_app_uninstall"
# after_app_uninstall = "frappe_hijri.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "frappe_hijri.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"frappe_hijri.tasks.all"
# 	],
# 	"daily": [
# 		"frappe_hijri.tasks.daily"
# 	],
# 	"hourly": [
# 		"frappe_hijri.tasks.hourly"
# 	],
# 	"weekly": [
# 		"frappe_hijri.tasks.weekly"
# 	],
# 	"monthly": [
# 		"frappe_hijri.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "frappe_hijri.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "frappe_hijri.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "frappe_hijri.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "frappe_hijri.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = []
# after_request = []

# Job Events
# ----------
# before_job = ["frappe_hijri.utils.before_job"]
# after_job = ["frappe_hijri.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"frappe_hijri.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []
