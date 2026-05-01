/**
 * Umm al-Qura Hijri ↔ Gregorian Conversion Library
 *
 * Based on the Umm al-Qura calendar used in Saudi Arabia.
 * Uses the Kuwaiti Algorithm for Hijri/Gregorian conversion.
 *
 * This is a lightweight JS port of the hijri-converter Python library.
 */

window.frappe_hijri = window.frappe_hijri || {};
frappe_hijri.hijri = (function () {
    /**
     * Convert Gregorian date to Hijri using the Kuwaiti Algorithm.
     */
    function gregorianToHijri(gy, gm, gd) {
        let jd =
            intPart((1461 * (gy + 4800 + intPart((gm - 14) / 12))) / 4) +
            intPart((367 * (gm - 2 - 12 * intPart((gm - 14) / 12))) / 12) -
            intPart((3 * intPart((gy + 4900 + intPart((gm - 14) / 12)) / 100)) / 4) +
            gd -
            32075;

        let l = jd - 1948440 + 10632;
        let n = intPart((l - 1) / 10631);
        l = l - 10631 * n + 354;
        let j =
            intPart((10985 - l) / 5316) * intPart((50 * l) / 17719) +
            intPart(l / 5670) * intPart((43 * l) / 15238);
        l =
            l -
            intPart((30 - j) / 15) * intPart((17719 * j) / 50) -
            intPart(j / 16) * intPart((15238 * j) / 43) +
            29;
        let hm = intPart((24 * l) / 709);
        let hd = l - intPart((709 * hm) / 24);
        let hy = 30 * n + j - 30;

        return { year: hy, month: hm, day: hd };
    }

    /**
     * Convert Hijri date to Gregorian using the Kuwaiti Algorithm.
     */
    function hijriToGregorian(hy, hm, hd) {
        let jd =
            intPart((11 * hy + 3) / 30) +
            354 * hy +
            30 * hm -
            intPart((hm - 1) / 2) +
            hd +
            1948440 -
            385;

        let l = jd + 68569;
        let n = intPart((4 * l) / 146097);
        l = l - intPart((146097 * n + 3) / 4);
        let i = intPart((4000 * (l + 1)) / 1461001);
        l = l - intPart((1461 * i) / 4) + 31;
        let j = intPart((80 * l) / 2447);
        let gd = l - intPart((2447 * j) / 80);
        l = intPart(j / 11);
        let gm = j + 2 - 12 * l;
        let gy = 100 * (n - 49) + i + l;

        return { year: gy, month: gm, day: gd };
    }

    function intPart(x) {
        return Math.trunc(x);
    }

    /**
     * Format a Hijri date object as YYYY-MM-DD string.
     */
    function formatHijri(h) {
        return (
            String(h.year) +
            "-" +
            String(h.month).padStart(2, "0") +
            "-" +
            String(h.day).padStart(2, "0")
        );
    }

    /**
     * Parse a YYYY-MM-DD string into {year, month, day}.
     */
    function parseDate(str) {
        let parts = str.split("-").map(Number);
        return { year: parts[0], month: parts[1], day: parts[2] };
    }

    /**
     * Get the number of days in a Hijri month (approximate).
     * Odd months have 30 days, even months have 29 days.
     * Month 12 has 30 days in leap years.
     */
    function hijriMonthDays(hy, hm) {
        if (hm === 12 && isHijriLeapYear(hy)) return 30;
        return hm % 2 === 1 ? 30 : 29;
    }

    /**
     * Check if a Hijri year is a leap year.
     * Leap years in the 30-year cycle: 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29
     */
    function isHijriLeapYear(hy) {
        return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(hy % 30);
    }

    /**
     * Get Hijri month name (Arabic).
     */
    function getMonthName(month) {
        const months = [
            "",
            "محرم",
            "صفر",
            "ربيع الأول",
            "ربيع الثاني",
            "جمادى الأولى",
            "جمادى الآخرة",
            "رجب",
            "شعبان",
            "رمضان",
            "شوال",
            "ذو القعدة",
            "ذو الحجة",
        ];
        return months[month] || "";
    }

    /**
     * Get Hijri month name (English transliteration).
     */
    function getMonthNameEn(month) {
        const months = [
            "",
            "Muharram",
            "Safar",
            "Rabi al-Awwal",
            "Rabi al-Thani",
            "Jumada al-Ula",
            "Jumada al-Akhirah",
            "Rajab",
            "Shaban",
            "Ramadan",
            "Shawwal",
            "Dhul Qadah",
            "Dhul Hijjah",
        ];
        return months[month] || "";
    }

    /**
     * Get abbreviated Hijri month name (English) — mirrors "Jan / Feb / Mar" style.
     * Used in the month-picker grid when the UI language is not Arabic.
     */
    function getMonthNameShort(month) {
        const months = [
            "",
            "Muh",     // Muharram
            "Saf",     // Safar
            "Rab I",   // Rabi al-Awwal
            "Rab II",  // Rabi al-Thani
            "Jum I",   // Jumada al-Ula
            "Jum II",  // Jumada al-Akhirah
            "Raj",     // Rajab
            "Sha",     // Shaban
            "Ram",     // Ramadan
            "Shaw",    // Shawwal
            "Dhu Q",   // Dhul Qadah
            "Dhu H",   // Dhul Hijjah
        ];
        return months[month] || "";
    }

    /**
     * Get the configured Hijri date format (e.g. "dd-mm-yyyy").
     * Falls back to "yyyy-mm-dd" if boot info is not available.
     */
    function getDateFormat() {
        return (frappe.boot && frappe.boot.hijri_date_format) || "yyyy-mm-dd";
    }

    /**
     * Format a system Hijri date (YYYY-MM-DD) to user display format.
     * E.g. "1447-10-07" → "07-10-1447" when format is "dd-mm-yyyy".
     */
    function formatHijriDate(value) {
        if (!value) return "";
        let p = value.split("-").map(Number);
        if (p.length !== 3 || isNaN(p[0])) return value;
        let yyyy = String(p[0]);
        let mm = String(p[1]).padStart(2, "0");
        let dd = String(p[2]).padStart(2, "0");
        return getDateFormat()
            .replace("yyyy", yyyy)
            .replace("mm", mm)
            .replace("dd", dd);
    }

    /**
     * Parse a user-formatted Hijri date string back to system format (YYYY-MM-DD).
     * E.g. "07-10-1447" → "1447-10-07" when format is "dd-mm-yyyy".
     * Returns "" if unparseable.
     */
    function parseHijriDate(value) {
        if (!value) return "";
        let fmt = getDateFormat();
        // Determine the separator used in the format
        let sep = fmt.replace(/[a-z]/g, "").charAt(0) || "-";
        let fmtParts = fmt.split(sep);
        let valParts = value.split(sep);
        if (valParts.length !== 3) return "";
        let y, m, d;
        for (let i = 0; i < 3; i++) {
            let token = fmtParts[i];
            let num = parseInt(valParts[i], 10);
            if (isNaN(num)) return "";
            if (token === "yyyy") y = num;
            else if (token === "mm") m = num;
            else if (token === "dd") d = num;
        }
        if (!y || !m || !d) return "";
        return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    }

    return {
        gregorianToHijri,
        hijriToGregorian,
        formatHijri,
        parseDate,
        hijriMonthDays,
        isHijriLeapYear,
        getMonthName,
        getMonthNameEn,
        getMonthNameShort,
        getDateFormat,
        formatHijriDate,
        parseHijriDate,
    };
})();
