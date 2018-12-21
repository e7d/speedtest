export default class DateFormat {
    /**
     * Format a date object to a universally readable format.
     *
     * @param {Date} d
     */
    static toISO(d = new Date()) {
        return `${d.getUTCFullYear()}/${(d.getUTCMonth() + 1)
            .toString()
            .padStart(2, "0")}/${d
            .getUTCDate()
            .toString()
            .padStart(2, "0")} ${d
            .getUTCHours()
            .toString()
            .padStart(2, "0")}:${d
            .getUTCMinutes()
            .toString()
            .padStart(2, "0")} UTC`;
    }
}
