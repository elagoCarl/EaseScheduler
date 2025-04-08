import { useState, useEffect } from "react";

// This component can be added to your Professor.jsx file
const ProfessorSearchFilter = ({ professors, onFilterChange }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [unitFilter, setUnitFilter] = useState("all");
    const [uniqueStatuses, setUniqueStatuses] = useState([]);

    // Extract unique statuses for the dropdown filter
    useEffect(() => {
        if (professors.length > 0) {
            const statuses = [...new Set(professors.map(prof => prof.Status))];
            setUniqueStatuses(statuses);
        }
    }, [professors]);

    // Apply filters whenever any filter changes
    useEffect(() => {
        const applyFilters = () => {
            let filteredProfessors = [...professors];

            // Apply search term filter (searches in name and email)
            if (searchTerm.trim() !== "") {
                const term = searchTerm.toLowerCase();
                filteredProfessors = filteredProfessors.filter(
                    prof =>
                        prof.Name.toLowerCase().includes(term) ||
                        prof.Email.toLowerCase().includes(term)
                );
            }

            // Apply status filter
            if (statusFilter !== "all") {
                filteredProfessors = filteredProfessors.filter(
                    prof => prof.Status === statusFilter
                );
            }

            // Apply unit filter
            if (unitFilter !== "all") {
                switch (unitFilter) {
                    case "lessThan3":
                        filteredProfessors = filteredProfessors.filter(prof => prof.Total_units < 3);
                        break;
                    case "3to6":
                        filteredProfessors = filteredProfessors.filter(prof => prof.Total_units >= 3 && prof.Total_units <= 6);
                        break;
                    case "moreThan6":
                        filteredProfessors = filteredProfessors.filter(prof => prof.Total_units > 6);
                        break;
                }
            }

            // Send filtered results back to parent component
            onFilterChange(filteredProfessors);
        };

        applyFilters();
    }, [searchTerm, statusFilter, unitFilter, professors, onFilterChange]);

    // Reset all filters
    const handleReset = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setUnitFilter("all");
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-4 w-full">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search input */}
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-customBlue1 focus:border-customBlue1 text-xs md:text-sm"
                    />
                </div>

                {/* Status filter */}
                <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Teaching Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-customBlue1 focus:border-customBlue1 text-xs md:text-sm"
                    >
                        <option value="all">All Statuses</option>
                        {uniqueStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                {/* Unit filter */}
                <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Total Units</label>
                    <select
                        value={unitFilter}
                        onChange={(e) => setUnitFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-customBlue1 focus:border-customBlue1 text-xs md:text-sm"
                    >
                        <option value="all">All Units</option>
                        <option value="lessThan3">Less than 3</option>
                        <option value="3to6">3 to 6</option>
                        <option value="moreThan6">More than 6</option>
                    </select>
                </div>
            </div>

            {/* Reset button */}
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs md:text-sm"
                >
                    Reset Filters
                </button>
            </div>
        </div>
    );
};

export default ProfessorSearchFilter;