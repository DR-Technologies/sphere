/**
 * Formats a date string or object to DD/MM/YYYY format.
 * Returns the original string or a fallback if the date is invalid.
 */
export function formatDate(date: any): string {
    if (!date) return '';

    try {
        const d = new Date(date);
        
        // Check if date is valid
        if (isNaN(d.getTime())) {
            return String(date);
        }

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}/${month}/${year}`;
    } catch (e) {
        return String(date);
    }
}
