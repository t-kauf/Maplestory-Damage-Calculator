declare global {
    interface Window {
        importData: () => void;
        exportData: () => void;
    }
}

interface ImportData {
    "gear-lab-data": string | null;    
    "loadout-data": string | null;
    theme?: string;

    damageCalculatorData?: string | unknown;
    heroPowerPresets?: string | unknown;
    cubePotentialData?: string | unknown;
    comparisonItems?: unknown;
    selectedClass?: string;
    selectedJobTier?: string;
    equipmentSlots?: string;
    "equipped.head"?: unknown;
    "equipped.shoulders"?: unknown;
    "equipped.chest"?: unknown;
    "equipped.cape"?: unknown;
    "equipped.ring"?: unknown;
    "equipped.neck"?: unknown;
    "equipped.eye-accessory"?: unknown;
    "equipped.belt"?: unknown;
    "equipped.gloves"?: unknown;
    "equipped.boots"?: unknown;
    "equipped.legs"?: unknown;
}

interface ExportData {
    "gear-lab-data": string | null;
    "loadout-data": string | null;
    theme: string | null;
}

window.importData = importData;
window.exportData = exportData;

// Import data from clipboard to local storage
export function importData(): void {
    navigator.clipboard.readText().then(text => {
        try {
            const data: unknown = JSON.parse(text);

            // Validate the data structure
            const importData = data as ImportData;

            // Confirm before overwriting
            if (!confirm('⚠️ This will overwrite your current data. Are you sure you want to continue?')) {
                return;
            }

            // Import each piece of data (stringify if it's an object)
            if (importData.damageCalculatorData) {
                const dataString = typeof importData.damageCalculatorData === 'string'
                    ? importData.damageCalculatorData
                    : JSON.stringify(importData.damageCalculatorData);
                localStorage.setItem('damageCalculatorData', dataString);
            }
            if (importData.heroPowerPresets) {
                const dataString = typeof importData.heroPowerPresets === 'string'
                    ? importData.heroPowerPresets
                    : JSON.stringify(importData.heroPowerPresets);
                localStorage.setItem('heroPowerPresets', dataString);
            }
            if (importData.cubePotentialData) {
                const dataString = typeof importData.cubePotentialData === 'string'
                    ? importData.cubePotentialData
                    : JSON.stringify(importData.cubePotentialData);
                localStorage.setItem('cubePotentialData', dataString);
            }
            if (importData.comparisonItems) {
                // importComparisonItems(importData.comparisonItems);
            }
            if (importData.selectedClass) {
                localStorage.setItem('selectedClass', importData.selectedClass);
            }
            if (importData.selectedJobTier) {
                localStorage.setItem('selectedJobTier', importData.selectedJobTier);
            }     

            if (importData.equipmentSlots) {
                localStorage.setItem('equipmentSlots', JSON.stringify(importData.equipmentSlots));
            }

            if(importData["equipped.head"])
            {
                localStorage.setItem('equipped.head',         JSON.stringify(importData["equipped.head"]));
                localStorage.setItem('equipped.cape',         JSON.stringify(importData["equipped.cape"]));
                localStorage.setItem('equipped.chest',        JSON.stringify(importData["equipped.chest"]));
                localStorage.setItem('equipped.legs',         JSON.stringify(importData["equipped.legs"]));
                localStorage.setItem('equipped.belt',         JSON.stringify(importData["equipped.belt"]));
                localStorage.setItem('equipped.gloves',       JSON.stringify(importData["equipped.gloves"]));
                localStorage.setItem('equipped.boots',        JSON.stringify(importData["equipped.boots"]));
                localStorage.setItem('equipped.shoulders',    JSON.stringify(importData["equipped.shoulders"]));
                localStorage.setItem('equipped.ring',         JSON.stringify(importData["equipped.ring"]));
                localStorage.setItem('equipped.neck',         JSON.stringify(importData["equipped.neck"]));
                localStorage.setItem('equipped.eye-accessory',    JSON.stringify(importData["equipped.eye-accessory"]));
            }

            if (importData.theme) {
                localStorage.setItem('theme', importData.theme);
            }

            if(importData["loadout-data"])
            {
                localStorage.setItem("loadout-data", JSON.stringify(importData["loadout-data"]));
            }

              if(importData["gear-lab-data"])
            {
                localStorage.setItem("gear-lab-data", JSON.stringify(importData["gear-lab-data"]));
            }

            alert('✅ Data imported successfully! Refreshing page...');
            location.reload();
        } catch (err) {
            console.error('Failed to import data:', err);
            alert('❌ Failed to import data. Please make sure you copied valid data.');
        }
    }).catch((err: unknown) => {
        console.error('Failed to read clipboard:', err);
        alert('❌ Failed to read clipboard. Please make sure you have data copied.');
    });
}

// Export all local storage data to clipboard
export function exportData(): void {
    const allData: ExportData = {
        "loadout-data": localStorage.getItem('loadout-data'),
        "gear-lab-data": localStorage.getItem('gear-lab-data'),
        theme: localStorage.getItem('theme')
    };

    // Parse JSON strings so they're not double-stringified
    (Object.keys(allData) as Array<keyof ExportData>).forEach(key => {
        const value = allData[key];
        if (value && typeof value === 'string') {
            try {
                allData[key] = JSON.parse(value) as never;
            } catch (e) {
                // If it's not JSON (like theme which is just a string), keep as is
            }
        }
    });

    const jsonString = JSON.stringify(allData, null, 2);

    navigator.clipboard.writeText(jsonString).then(() => {
        alert('✅ Data copied to clipboard! You can now paste it on another device.');
    }).catch((err: unknown) => {
        console.error('Failed to copy data:', err);
        alert('❌ Failed to copy data. Please check console for details.');
    });
}
