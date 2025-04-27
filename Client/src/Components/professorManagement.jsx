import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, Search, X, Calendar, Edit, Trash2, Filter, ChevronRight, BookOpen, ChevronLeft } from 'lucide-react';
import axios from "../axiosConfig";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from "./callComponents/sideBar";
import TopMenu from "./callComponents/topMenu";
import AddProfModal from "./callComponents/addProfModal";
import EditProfModal from "./callComponents/editProfModal";
import DeleteWarning from "./callComponents/deleteWarning";
import ProfAvailabilityModal from "./callComponents/profAvailabilityModal";

const ProfessorManagement = () => {
    // States
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [professors, setProfessors] = useState([]);
    const [filteredProfessors, setFilteredProfessors] = useState([]);
    const [profStatusMap, setProfStatusMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddProfModalOpen, setIsAddProfModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
    const [selectedProf, setSelectedProf] = useState(null);
    const [selectedProfIds, setSelectedProfIds] = useState([]);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [selectedProfForAvailability, setSelectedProfForAvailability] = useState(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const professorsPerPage = 8;

    // Functions
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    // Show notification using Toastify
    const showNotification = (message, type = "info") => {
        switch (type) {
            case "success":
                toast.success(message);
                break;
            case "error":
                toast.error(message);
                break;
            case "warning":
                toast.warning(message);
                break;
            default:
                toast.info(message);
        }
    };

    const fetchProfStatuses = async () => {
        try {
            const response = await axios.get("/profStatus/getAllStatus");
            if (response.data.successful) {
                const statusData = response.data.data;
                const statusMap = {};
                statusData.forEach(status => {
                    statusMap[status.id] = {
                        status: status.Status,
                        maxUnits: status.Max_units
                    };
                });
                setProfStatusMap(statusMap);
            }
        } catch (error) {
            console.error("Failed to fetch professor statuses:", error.message);
            showNotification("Failed to fetch professor statuses", "error");
        }
    };

    const getLoadingStatus = (professor) => {
        if (!professor || !professor.Status || Object.keys(profStatusMap).length === 0) {
            return "Normal";
        }

        const statusName = professor.Status;
        let statusId = null;

        for (const [id, statusInfo] of Object.entries(profStatusMap)) {
            if (statusInfo.status === statusName) {
                statusId = id;
                break;
            }
        }

        if (!statusId) return "Normal";

        const maxUnits = profStatusMap[statusId].maxUnits;
        const totalUnits = professor.Total_units;

        if (totalUnits < maxUnits) return "Unit Underload";
        if (totalUnits > maxUnits) return "Unit Overload";
        return "Normal";
    };

    const fetchProfessors = async () => {
        try {
            const response = await axios.get("/prof/getAllProf");
            if (response.data.successful) {
                const professorData = response.data.data;
                const transformedData = professorData.map(prof => ({
                    id: prof.id,
                    name: prof.Name,
                    status: prof.Status,
                    loadStatus: getLoadingStatus(prof),
                    details: {
                        email: prof.Email,
                        units: prof.Total_units,
                        department: prof.Department || "Department not set"
                    },
                    courses: prof.Courses || [],
                    minimized: false,
                    rawData: prof
                }));

                setProfessors(transformedData);
                setFilteredProfessors(transformedData);
                // Reset to first page when fetching new data
                setCurrentPage(1);
            }
        } catch (error) {
            console.error("Failed to fetch professors:", error.message);
            setError("Error fetching professors: " + error.message);
            showNotification("Failed to fetch professors", "error");
        } finally {
            setLoading(false);
        }
    };

    const toggleMinimize = (id) => {
        setProfessors(professors.map(prof =>
            prof.id === id ? { ...prof, minimized: !prof.minimized } : prof
        ));
    };

    const minimizeAll = () => {
        setProfessors(professors.map(prof => ({ ...prof, minimized: true })));
    };

    const maximizeAll = () => {
        setProfessors(professors.map(prof => ({ ...prof, minimized: false })));
    };

    const handleEditClick = async (profId) => {
        try {
            const response = await axios.get(`/prof/getProf/${profId}`);
            const professorData = response.data.data;

            if (professorData && professorData.Name && professorData.Email) {
                setSelectedProf({
                    ...professorData,
                    StatusId: professorData.StatusId,
                });
                setIsEditModalOpen(true);
            } else {
                showNotification("Could not retrieve professor details", "error");
            }
        } catch (error) {
            showNotification("Error fetching professor details", "error");
        }
    };

    const deleteCard = (id) => {
        setSelectedProfIds([id]);
        setIsDeleteWarningOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (selectedProfIds.length === 0) {
            showNotification("No professors selected for deletion", "error");
            return;
        }

        try {
            for (const id of selectedProfIds) {
                await axios.delete(`/prof/deleteProf/${id}`);
            }
            fetchProfessors();
            setIsDeleteWarningOpen(false);
            showNotification(`${selectedProfIds.length > 1 ? 'Professors' : 'Professor'} deleted successfully`, "success");
            setSelectedProfIds([]);
        } catch (error) {
            showNotification("Error deleting professors", "error");
        }
    };

    const handleAvailabilityClick = (professor) => {
        setSelectedProfForAvailability(professor);
        setIsAvailabilityModalOpen(true);
    };

    // Pagination functions
    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const nextPage = () => {
        if (currentPage < Math.ceil(filteredProfessors.length / professorsPerPage)) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    // Get current professors
    const indexOfLastProfessor = currentPage * professorsPerPage;
    const indexOfFirstProfessor = indexOfLastProfessor - professorsPerPage;
    const currentProfessors = filteredProfessors.slice(indexOfFirstProfessor, indexOfLastProfessor);

    // Helper functions for styling
    const getStatusColor = (status) => {
        switch (status) {
            case "Full-time": return "bg-emerald-100 text-emerald-800 border-emerald-200";
            case "Part-time": return "bg-blue-100 text-blue-800 border-blue-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getLoadStatusColor = (loadStatus) => {
        switch (loadStatus) {
            case "Unit Overload": return "bg-red-100 text-red-800 border-red-200";
            case "Unit Underload": return "bg-amber-100 text-amber-800 border-amber-200";
            case "Normal": return "bg-emerald-100 text-emerald-800 border-emerald-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    // Effects
    useEffect(() => {
        fetchProfStatuses();
        fetchProfessors();
    }, []);

    useEffect(() => {
        const filteredProfsList = professors.filter(professor => {
            const searchMatch = searchTerm.toLowerCase() === '' ||
                professor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.loadStatus.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.details.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.details.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (professor.courses && professor.courses.some(course => course.toLowerCase().includes(searchTerm.toLowerCase())));
            if (activeTab === 'all') return searchMatch;
            if (activeTab === 'full-time') return searchMatch && professor.status === 'Full-time';
            if (activeTab === 'part-time') return searchMatch && professor.status === 'Part-time';
            return searchMatch;
        });

        setFilteredProfessors(filteredProfsList);
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [searchTerm, activeTab, professors]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="bg-slate-900 min-h-screen flex flex-col">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <TopMenu toggleSidebar={toggleSidebar} />

            {/* React-Toastify Container */}
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />

            <div className="flex-grow flex justify-center items-center pt-20 pb-8 px-4">
                <div className="w-full max-w-7xl my-50">
                    <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">Professor Management</h1>
                        </div>
                        <div className="bg-white px-4 py-2 rounded shadow-md flex items-center mt-4 md:mt-0">
                            <span className="text-gray-800 font-medium">Total Professors: <span className="text-blue-600">{professors.length}</span></span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded shadow-md mb-6 ">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    placeholder="Search professors, courses, departments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-3 pl-11 border rounded shadow-sm transition duration-200 border-gray-300 hover:border-gray-400"
                                />
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Search size={18} className="text-gray-400" />
                                </div>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-4 py-2.5 rounded text-sm font-medium transition duration-200 ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    All
                                </button>
                                <div className="relative ml-1">
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`px-4 py-2.5 rounded text-sm font-medium transition duration-200 flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        <Filter size={16} />
                                        Status
                                    </button>

                                    {showFilters && (
                                        <div className="absolute right-0 mt-2 rounded bg-white shadow-xl z-10 ">
                                            <div className="p-2">
                                                <button onClick={() => { setActiveTab('full-time'); setShowFilters(false); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded hover:text-blue-700 transition duration-150 flex items-center"
                                                >
                                                    <span className="w-3 h-3 rounded-md bg-emerald-400 mr-2"></span>
                                                    Full-time
                                                </button>
                                                <button onClick={() => { setActiveTab('part-time'); setShowFilters(false); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded hover:text-blue-700 transition duration-150 flex items-center"
                                                >
                                                    <span className="w-3 h-3 rounded-md bg-blue-400 mr-2"></span>
                                                    Part-time
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mt-4 border-t border-gray-100 pt-4">
                            <button onClick={minimizeAll} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition duration-200 flex items-center gap-2">
                                <ChevronUp size={16} />
                                Collapse All
                            </button>
                            <button onClick={maximizeAll} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition duration-200 flex items-center gap-2">
                                <ChevronDown size={16} />
                                Expand All
                            </button>
                            <button onClick={() => setIsAddProfModalOpen(true)} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md">
                                <Plus size={16} />
                                Add Professor
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-10">
                        {currentProfessors.length > 0 ? (
                            currentProfessors.map(professor => (
                                <div key={professor.id} className="bg-white rounded shadow-md overflow-hidden  hover:shadow-lg transition duration-300">
                                    <div className="bg-blue-600 p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-semibold text-white">{professor.name}</h2>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getStatusColor(professor.status)}`}>
                                                        {professor.status}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getLoadStatusColor(professor.loadStatus)}`}>
                                                        {professor.loadStatus}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleMinimize(professor.id)}
                                                className="p-1.5 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30 transition-all"
                                            >
                                                {professor.minimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                            </button>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-blue-500 border-opacity-30 text-white text-sm flex flex-wrap gap-4">
                                            <div className="flex items-center gap-2">
                                                <span>{professor.details.email}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <BookOpen size={14} className="text-blue-200" />
                                                <span>{professor.details.units} Units</span>
                                            </div>
                                        </div>
                                    </div>

                                    {!professor.minimized && (
                                        <div className="p-4">
                                            <div className="mb-3 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-gray-800">Courses</h3>
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-md">
                                                        {professor.courses ? professor.courses.length : 0}
                                                    </span>
                                                </div>
                                                <button className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition duration-150">
                                                    <Plus size={14} />
                                                    Assign Course
                                                </button>
                                            </div>

                                            {professor.courses && professor.courses.length > 0 ? (
                                                <div className="space-y-2">
                                                    {professor.courses.map((course, index) => (
                                                        <div key={index} className="flex justify-between items-center p-2.5 bg-gray-50 rounded hover:bg-gray-100 transition duration-150  group">
                                                            <div className="flex items-start gap-2">
                                                                <div className="text-blue-500 mt-0.5">
                                                                    <ChevronRight size={14} />
                                                                </div>
                                                                <span className="text-gray-800 text-sm">{course}</span>
                                                            </div>
                                                            <button className="text-xs py-1 px-2 bg-white text-red-600 rounded hover:bg-red-50 transition duration-150 border border-gray-200 opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                                                <X size={12} />
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-200">
                                                    <p className="text-gray-500 text-sm">No courses assigned</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                                        <button
                                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition duration-150 flex items-center gap-1"
                                            onClick={() => handleAvailabilityClick(professor)}
                                        >
                                            <Calendar size={14} />
                                            Availability
                                        </button>

                                        <div className="flex gap-1">
                                            <button
                                                className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition duration-150"
                                                onClick={() => handleEditClick(professor.id)}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition duration-150"
                                                onClick={() => deleteCard(professor.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded shadow-md ">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">No professors found</h3>
                                <p className="text-gray-500 mb-4">No professors match your current search or filters.</p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => { setSearchTerm(''); setActiveTab('all'); }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 shadow-md"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pagination Component */}
                    {filteredProfessors.length > 0 && (
                        <div className="mt-8 bg-white rounded shadow-md p-4 ">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing <span className="font-medium">{indexOfFirstProfessor + 1}</span> to{" "}
                                    <span className="font-medium">
                                        {Math.min(indexOfLastProfessor, filteredProfessors.length)}
                                    </span>{" "}
                                    of <span className="font-medium">{filteredProfessors.length}</span> professors
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={prevPage}
                                        disabled={currentPage === 1}
                                        className={`p-2 rounded border border-gray-300 ${currentPage === 1
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            : "bg-white text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {Array.from({ length: Math.ceil(filteredProfessors.length / professorsPerPage) }).map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => paginate(index + 1)}
                                            className={`px-3 py-1 rounded ${currentPage === index + 1
                                                ? "bg-blue-600 text-white"
                                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                                                }`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={nextPage}
                                        disabled={currentPage === Math.ceil(filteredProfessors.length / professorsPerPage)}
                                        className={`p-2 rounded border border-gray-300 ${currentPage === Math.ceil(filteredProfessors.length / professorsPerPage)
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            : "bg-white text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isAddProfModalOpen &&
                <AddProfModal
                    isOpen={isAddProfModalOpen}
                    onClose={() => {
                        setIsAddProfModalOpen(false);
                        fetchProfessors();
                    }} />}

            {isEditModalOpen && selectedProf &&
                <EditProfModal
                    professor={selectedProf}
                    onClose={() => setIsEditModalOpen(false)}
                    onUpdate={() => {
                        setIsEditModalOpen(false);
                        fetchProfessors();
                    }} />}
            {isDeleteWarningOpen &&
                <DeleteWarning
                    isOpen={isDeleteWarningOpen}
                    onClose={() => setIsDeleteWarningOpen(false)}
                    onConfirm={handleConfirmDelete}
                />}
            {isAvailabilityModalOpen && selectedProfForAvailability && (
                <ProfAvailabilityModal
                    isOpen={isAvailabilityModalOpen}
                    onClose={() => setIsAvailabilityModalOpen(false)}
                    professorId={selectedProfForAvailability.id}
                    professorName={selectedProfForAvailability.name}
                />
            )}
        </div>
    );
}

export default ProfessorManagement;