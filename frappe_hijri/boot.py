import frappe
from frappe_hijri import get_hijri_date_format


def extend_bootinfo(bootinfo):
    bootinfo.hijri_date_format = get_hijri_date_format()
