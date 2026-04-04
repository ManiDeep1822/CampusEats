/**
 * Utility to generate and trigger a CSV download from an array of objects.
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Desired filename (without extension)
 * @param {Array} headers - Optional array of { label, key } objects to define columns
 */
export const downloadCSV = (data, fileName, headers = []) => {
    if (!data || !data.length) return;

    let csvContent = "";
    
    // 1. Header Row
    if (headers.length > 0) {
        csvContent += headers.map(h => h.label).join(",") + "\n";
    } else {
        csvContent += Object.keys(data[0]).join(",") + "\n";
    }

    // 2. Data Rows
    data.forEach(item => {
        const row = headers.length > 0 
            ? headers.map(h => {
                const val = getNestedValue(item, h.key);
                return `"${String(val).replace(/"/g, '""')}"`;
              })
            : Object.values(item).map(val => `"${String(val).replace(/"/g, '""')}"`);
            
        csvContent += row.join(",") + "\n";
    });

    // 3. Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Helper to extract nested object values (e.g., 'vendorId.shopName')
 */
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || '';
};
