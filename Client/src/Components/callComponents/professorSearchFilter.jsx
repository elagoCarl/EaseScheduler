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
        <div className="w-full flex justify-end gap-5">
            {/* Search input */}
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for professors"
                className="p-2 pl-5 border border-gray-300 rounded bg-white text-xs md:text-sm w-200"
            />

            {/* Status filter */}
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded bg-white text-xs md:text-sm"
            >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>

            {/* Unit filter */}
            <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded bg-white text-xs md:text-sm"
            >
                <option value="all">All Units</option>
                <option value="lessThan3">Less than 3</option>
                <option value="3to6">3 to 6</option>
                <option value="moreThan6">More than 6</option>
            </select>

            <button
                onClick={handleReset}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-xs md:text-sm"
            >
                Reset Filters
            </button>
        </div>
    );
};

export default ProfessorSearchFilter;