/**
 * Formats a date string into a localized date string.
 * Handles ISO strings and date-only strings consistently.
 */
export const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    // Use robust parsing to avoid "day before" offsets caused by timezone interpretation of ISO strings
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = cleanDate.split('-').map(Number);
    
    // If parsing fails, fall back to native Date (though it might have offset issues, it's better than crashing)
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
    }
    
    // Constructing date with year, monthIndex, day correctly uses local midnight
    return new Date(year, month - 1, day).toLocaleDateString();
};
