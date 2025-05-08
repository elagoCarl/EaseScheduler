import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, X, Calendar, Edit, Trash2, Filter, ChevronRight, BookOpen, ChevronLeft, Search } from 'lucide-react';
import axios from "../axiosConfig";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from "./callComponents/sideBar";
import TopMenu from "./callComponents/topMenu";
import AddProfModal from "./callComponents/profManagement/addProfModal.jsx";
import EditProfModal from "./callComponents/profManagement/editProfModal.jsx";
import DeleteWarning from "./callComponents/deleteWarning";
import ProfAvailabilityModal from "./callComponents/profManagement/profAvailabilityModal.jsx";
import ProfStatusModal from "./callComponents/profManagement/profStatusModal.jsx";
import AddAssignationModal from "./callComponents/profManagement/addAssignationModal.jsx";
import CourseAssignments from "./callComponents/profManagement/courseAssignments.jsx";
import { useAuth } from '../Components/authContext.jsx';

const ProfessorManagement = () => {
    const { user } = useAuth();
    const DEPARTMENT_ID = user.DepartmentId;
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [professors, setProfessors] = useState([]);
    const [filteredProfessors, setFilteredProfessors] = useState([]);
    const [profStatusMap, setProfStatusMap] = useState({});
    const [statusList, setStatusList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddProfModalOpen, setIsAddProfModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
    const [selectedProf, setSelectedProf] = useState(null);
    const [selectedProfIds, setSelectedProfIds] = useState([]);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [selectedProfForAvailability, setSelectedProfForAvailability] = useState(null);
    const [isProfStatusModalOpen, setIsProfStatusModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [departmentAssignations, setDepartmentAssignations] = useState([]);
    const [isAssignCourseModalOpen, setIsAssignCourseModalOpen] = useState(false);
    const [selectedProfForCourse, setSelectedProfForCourse] = useState(null);
    const [isDeleteAssignmentWarningOpen, setIsDeleteAssignmentWarningOpen] = useState(false);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
    const [schoolYears, setSchoolYears] = useState([]);
    const [selectedSchoolYears, setSelectedSchoolYears] = useState({});
    const professorsPerPage = 8;
    const showNotification = (message, type = "info") => toast[type](message);

    const fetchData = async () => {
        try {
            await Promise.all([
                fetchProfStatuses(),
                fetchProfessors(),
                fetchDepartmentAssignations(),
                fetchSchoolYears()
            ]);
        } catch (error) {
            setError("Error fetching data: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchoolYears = async () => {
        try {
            const response = await axios.get("/schoolYear/getAllSchoolYears");
            if (response.data.successful) {
                setSchoolYears(response.data.data);

                // Initialize selected school years with the first in the list for each professor
                if (response.data.data.length > 0) {
                    const defaultSchoolYear = response.data.data[0];
                    const initialSelectedYears = {};
                    professors.forEach(prof => {
                        initialSelectedYears[prof.id] = defaultSchoolYear.id;
                    });
                    setSelectedSchoolYears(initialSelectedYears);
                }
            }
        } catch (error) {
            showNotification("Failed to fetch school years", "error");
        }
    };

    const [professorLoads, setProfessorLoads] = useState({});
    const [loadingProfessorLoads, setLoadingProfessorLoads] = useState({});

    const fetchProfessorLoad = async (profId, syId) => {
        if (!profId || !syId) return;

        try {
            setLoadingProfessorLoads(prev => ({
                ...prev,
                [profId]: true
            }));

            const response = await axios.get("/profLoad/getProfLoadByProfAndSY", {
                params: {
                    profId: profId,
                    syId: syId
                }
            });

            if (response.data.successful) {
                setProfessorLoads(prev => ({
                    ...prev,
                    [`${profId}-${syId}`]: response.data.data
                }));
            } else {
                // If no load found or error, set to null to indicate we checked but nothing found
                setProfessorLoads(prev => ({
                    ...prev,
                    [`${profId}-${syId}`]: null
                }));
            }
        } catch (error) {
            console.error("Error fetching professor load:", error);
            showNotification(`Failed to load professor workload: ${error.message}`, "error");
            setProfessorLoads(prev => ({
                ...prev,
                [`${profId}-${syId}`]: null
            }));
        } finally {
            setLoadingProfessorLoads(prev => ({
                ...prev,
                [profId]: false
            }));
        }
    };

    const handleSchoolYearChange = (profId, schoolYearId) => {
        setSelectedSchoolYears(prev => ({
            ...prev,
            [profId]: schoolYearId
        }));

        // When school year changes, fetch the load for this professor and school year
        fetchProfessorLoad(profId, schoolYearId);
    };

    const fetchDepartmentAssignations = async () => {
        try {
            const response = await axios.get(`/assignation/getAllAssignationsByDept/${DEPARTMENT_ID}`);
            if (response.data.successful) {
                setDepartmentAssignations(response.data.data);
            }
        } catch (error) {
            showNotification("Failed to fetch course assignations", "error");
        }
    };

    const fetchProfStatuses = async () => {
        try {
            const response = await axios.get("/profStatus/getAllStatus");
            if (response.data.successful) {
                const statusMap = {};
                const statuses = [];
                response.data.data.forEach(status => {
                    statusMap[status.id] = {
                        status: status.Status,
                        maxUnits: status.Max_units
                    };
                    statuses.push(status.Status);
                });
                setProfStatusMap(statusMap);
                setStatusList(statuses);
            }
        } catch (error) {
            showNotification("Failed to fetch professor statuses", "error");
        }
    };

    const getLoadingStatus = (professor, semester, schoolYearId) => {
        if (!professor || Object.keys(profStatusMap).length === 0) return "Normal Load";

        const statusName = professor.status;
        const statusId = Object.entries(profStatusMap).find(
            ([, info]) => info.status === statusName
        )?.[0];

        if (!statusId) return "Normal Load";

        const maxUnits = profStatusMap[statusId].maxUnits;

        // Get semester units from professor loads if available
        const loadKey = `${professor.id}-${schoolYearId}`;
        const profLoad = professorLoads[loadKey];

        // Use the load data if available, otherwise fall back to professor details
        const semesterUnits = profLoad
            ? (semester === 1 ? profLoad.First_Sem_Units : profLoad.Second_Sem_Units)
            : (semester === 1 ? professor.details.firstSemUnits : professor.details.secondSemUnits);

        if (semesterUnits < maxUnits) return "Underload";
        if (semesterUnits > maxUnits) return "Overload";
        return "Normal Load";
    };

    const fetchProfessors = async () => {
        try {
            const response = await axios.get("/prof/getAllProf");
            if (response.data.successful) {
                const transformedData = response.data.data.map(prof => ({
                    id: prof.id,
                    name: prof.Name,
                    status: prof.Status,
                    loadStatus1: getLoadingStatus(prof, 1),  // First semester load status
                    loadStatus2: getLoadingStatus(prof, 2),  // Second semester load status
                    details: {
                        email: prof.Email,
                        firstSemUnits: prof.FirstSemUnits || 0,
                        secondSemUnits: prof.SecondSemUnits || 0,
                        department: prof.Department || "Department not set"
                    },
                    courses: prof.Courses || [],
                    minimized: false,
                    rawData: prof
                }));
                setProfessors(transformedData);
                setFilteredProfessors(transformedData);
                setCurrentPage(1);
            }
        } catch (error) {
            showNotification("Failed to fetch professors", "error");
        }
    };

    const toggleMinimize = (id) => {
        setProfessors(prevProfessors => prevProfessors.map(prof =>
            prof.id === id ? { ...prof, minimized: !prof.minimized } : prof
        ));
        // Also update the filtered professors to avoid page reset
        setFilteredProfessors(prevFiltered => prevFiltered.map(prof =>
            prof.id === id ? { ...prof, minimized: !prof.minimized } : prof
        ));
    };

    const handleEditClick = async (profId) => {
        try {
            const response = await axios.get(`/prof/getProf/${profId}`);
            if (response.data.successful) {
                setSelectedProf({ ...response.data.data });
                setIsEditModalOpen(true);
            }
        } catch (error) {
            showNotification("Error fetching professor details", "error");
        }
    };

    const handleConfirmDelete = async () => {
        if (selectedProfIds.length === 0) return;
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

    const handleDeleteAssignment = async () => {
        if (!selectedAssignmentId) return;

        try {
            const response = await axios.delete(`/assignation/deleteAssignation/${selectedAssignmentId}`);
            if (response.data.successful) {
                fetchDepartmentAssignations();
                fetchProfessors();
                showNotification("Assignment removed successfully", "success");
            } else {
                showNotification("Failed to remove assignment", "error");
            }
        } catch (error) {
            showNotification("Error removing assignment: " + error.message, "error");
        } finally {
            setIsDeleteAssignmentWarningOpen(false);
            setSelectedAssignmentId(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Full-time": return "bg-emerald-100 text-emerald-800 border-emerald-200";
            case "Part-time": return "bg-blue-100 text-blue-800 border-blue-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getLoadStatusColor = (loadStatus) => {
        switch (loadStatus) {
            case "Overload": return "bg-red-100 text-red-800 border-red-200";
            case "Underload": return "bg-amber-100 text-amber-800 border-amber-200";
            case "Normal Load": return "bg-emerald-100 text-emerald-800 border-emerald-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    useEffect(() => {
        const filtered = professors.filter(professor => {
            const searchMatch = searchTerm.toLowerCase() === '' ||
                professor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.loadStatus1.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.loadStatus2.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.details.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                professor.details.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (professor.courses && professor.courses.some(course =>
                    course.toLowerCase().includes(searchTerm.toLowerCase())));

            if (activeTab === 'all') return searchMatch;
            return searchMatch && professor.status === activeTab;
        });

        setFilteredProfessors(filtered);

        // Only reset page when search term or active tab changes, not when just minimizing
        if (searchTerm !== '' || activeTab !== 'all') {
            setCurrentPage(1);
        }
    }, [searchTerm, activeTab, professors]);


    useEffect(() => {
        fetchData();
    }, []);

    // Effect to load professor loads when professors or selected school years change
    useEffect(() => {
        // Update professor loadStatus1 and loadStatus2 whenever load data changes
        const updatedProfessors = professors.map(prof => {
            const schoolYearId = selectedSchoolYears[prof.id];
            return {
                ...prof,
                loadStatus1: getLoadingStatus(prof, 1, schoolYearId),
                loadStatus2: getLoadingStatus(prof, 2, schoolYearId)
            };
        });

        setProfessors(updatedProfessors);
    }, [professorLoads, selectedSchoolYears]);

    // Handler functions for CourseAssignments component
    const handleAssignCourse = (professor) => {
        setSelectedProfForCourse(professor);
        setIsAssignCourseModalOpen(true);
    };

    const handleDeleteCourseAssignment = (assignmentId) => {
        setSelectedAssignmentId(assignmentId);
        setIsDeleteAssignmentWarningOpen(true);
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    const indexOfLastProfessor = currentPage * professorsPerPage;
    const indexOfFirstProfessor = indexOfLastProfessor - professorsPerPage;
    const currentProfessors = filteredProfessors.slice(indexOfFirstProfessor, indexOfLastProfessor);

    return (
        <div className="bg-gray-800 min-h-screen flex flex-col">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
            <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
            <ToastContainer position="top-right" autoClose={3000} />

            <div className="flex-grow flex justify-center items-center pt-20 pb-8 px-4">
                <div className="w-full max-w-sm sm:max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl my-60">
                    <div className="mb-6 flex flex-col md:flex-row justify-between items-center">
                        <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">Professor Management</h1>
                        <div className="flex items-center gap-6">
                            <div className="bg-white px-4 py-2 rounded shadow-md">
                                <span className="text-gray-800 font-medium">Total Professors: <span className="text-blue-600">{professors.length}</span></span>
                            </div>
                            <button onClick={() => setIsProfStatusModalOpen(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center gap-2"
                            >
                                <Filter size={16} />
                                Manage Status
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-12 sm:p-8 md:p-12 rounded shadow-md mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-grow">
                                <input type="text" placeholder="Search professors, courses, departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-3 pl-11 border rounded shadow-sm transition duration-200 border-gray-300 hover:border-gray-400"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setActiveTab('all')}
                                    className={`px-4 rounded text-sm font-medium transition duration-200 ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    All
                                </button>
                                <div className="relative ml-1">
                                    <button onClick={() => setShowFilters(!showFilters)}
                                        className={`px-4 py-1.5 rounded text-sm font-medium transition duration-200 flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-black hover:bg-gray-300 duration-300'}`}
                                    >
                                        <Filter size={16} />
                                        Status
                                    </button>

                                    {showFilters && (
                                        <div className="absolute right-0 mt-2 rounded bg-white shadow-xl z-10">
                                            <div className="p-2 w-80">
                                                {statusList.length > 0 ? (
                                                    statusList.map((status, index) => (
                                                        <button key={index} onClick={() => {
                                                            setActiveTab(status);
                                                            setShowFilters(false);
                                                        }}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 duration-300 rounded hover:text-blue-700 transition flex items-center"
                                                        >
                                                            <span className={`w-3 h-3 rounded-md ${status === 'Full-time' ? 'bg-emerald-400' : status === 'Part-time' ? 'bg-blue-400' : 'bg-gray-400'} mr-2`}></span>
                                                            {status}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="px-4 py-2 text-sm text-gray-500">No statuses available</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mt-4 border-t border-gray-100 pt-4">
                            <button onClick={() => setProfessors(professors.map(prof => ({ ...prof, minimized: false })))}
                                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md">
                                <ChevronDown size={16} />
                                Expand All
                            </button>
                            <button onClick={() => setProfessors(professors.map(prof => ({ ...prof, minimized: true })))}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition duration-200 flex items-center gap-2">
                                <ChevronUp size={16} />
                                Collapse All
                            </button>
                            <button onClick={() => setIsAddProfModalOpen(true)}
                                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md">
                                <Plus size={16} />
                                Add Professor
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:p-8 gap-12 lg:gap-16 mt-10">
                        {currentProfessors.length > 0 ? (
                            currentProfessors.map(professor => (
                                <div key={professor.id} className="bg-white rounded shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                                    <div className="bg-blue-600 p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-semibold text-white tracking-tight">{professor.name}</h2>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {/* Existing status badge */}
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getStatusColor(professor.status)}`}>
                                                        {professor.status}
                                                    </span>

                                                    {/* New load‐status badges */}
                                                    <span
                                                        className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getLoadStatusColor(getLoadingStatus(professor, 1, selectedSchoolYears[professor.id]))}`}
                                                    >
                                                        Sem 1: {getLoadingStatus(professor, 1, selectedSchoolYears[professor.id])}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getLoadStatusColor(getLoadingStatus(professor, 2, selectedSchoolYears[professor.id]))}`}
                                                    >
                                                        Sem 2: {getLoadingStatus(professor, 2, selectedSchoolYears[professor.id])}
                                                    </span>
                                                </div>

                                            </div>
                                            <button onClick={() => toggleMinimize(professor.id)}
                                                className="p-1.5 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30 transition-all"
                                            >
                                                {professor.minimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                            </button>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-blue-500 border-opacity-30 text-white text-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span>{professor.details.email}</span>
                                            </div>

                                            {/* School Year Dropdown */}
                                            <div className="mb-3">
                                                <label htmlFor={`schoolYear-${professor.id}`} className="block text-xs font-medium text-blue-100 mb-1">
                                                    School Year
                                                </label>
                                                <select
                                                    id={`schoolYear-${professor.id}`}
                                                    value={selectedSchoolYears[professor.id] || ''}
                                                    onChange={(e) => handleSchoolYearChange(professor.id, e.target.value)}
                                                    className="w-full bg-white bg-opacity-10 border border-blue-400 border-opacity-30 rounded py-1 px-2 text-white text-sm"
                                                >
                                                    {schoolYears.length > 0 ? (
                                                        schoolYears.map((year) => (
                                                            <option key={year.id} value={year.id} className="bg-blue-700 text-white">
                                                                {year.SY_Name}
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option value="" disabled className="bg-blue-700 text-white">
                                                            No school years available
                                                        </option>
                                                    )}
                                                </select>
                                            </div>

                                            {/* Semester load info */}
                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                {/* First Semester */}
                                                <div className="bg-white bg-opacity-10 rounded p-2">
                                                    <h4 className="text-xs font-medium mb-1">First Semester</h4>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1">
                                                            <BookOpen size={14} className="text-blue-200" />
                                                            {loadingProfessorLoads[professor.id] ? (
                                                                <span>Loading...</span>
                                                            ) : (
                                                                <span>
                                                                    {professorLoads[`${professor.id}-${selectedSchoolYears[professor.id]}`]?.First_Sem_Units ??
                                                                        professor.details.firstSemUnits ?? 0} Units
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Second Semester */}
                                                <div className="bg-white bg-opacity-10 rounded p-2">
                                                    <h4 className="text-xs font-medium mb-1">Second Semester</h4>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1">
                                                            <BookOpen size={14} className="text-blue-200" />
                                                            {loadingProfessorLoads[professor.id] ? (
                                                                <span>Loading...</span>
                                                            ) : (
                                                                <span>
                                                                    {professorLoads[`${professor.id}-${selectedSchoolYears[professor.id]}`]?.Second_Sem_Units ??
                                                                        professor.details.secondSemUnits ?? 0} Units
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`transition-all duration-300 ${professor.minimized ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-screen opacity-100'}`}>
                                        <CourseAssignments
                                            professor={professor}
                                            departmentAssignations={departmentAssignations}
                                            onAssignCourse={handleAssignCourse}
                                            onDeleteAssignment={handleDeleteCourseAssignment}
                                        />
                                    </div>

                                    <div className="px-4 py-3 m-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                                        <button
                                            className="px-3 py-1.5 bg-gray-200 gap-4 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition duration-150 flex items-center" onClick={() => {
                                                setSelectedProfForAvailability(professor);
                                                setIsAvailabilityModalOpen(true);
                                            }}
                                        >
                                            <Calendar size={14} />
                                            Availability
                                        </button>

                                        <div className="flex gap-1">
                                            <button
                                                className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition duration-150" onClick={() => handleEditClick(professor.id)}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition duration-150" onClick={() => {
                                                    setSelectedProfIds([professor.id]);
                                                    setIsDeleteWarningOpen(true);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded shadow-md">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">No professors found</h3>
                                <p className="text-gray-500 mb-4">No professors match your current search or filters.</p>
                                <button onClick={() => { setSearchTerm(''); setActiveTab('all'); }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 shadow-md"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {filteredProfessors.length > 0 && (
                        <div className="mt-8 bg-white rounded shadow-md p-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between">
                                <div className="text-sm text-gray-600 mb-2 sm:mb-0">
                                    Showing <span className="font-medium">{indexOfFirstProfessor + 1}</span> to{" "}
                                    <span className="font-medium">
                                        {Math.min(indexOfLastProfessor, filteredProfessors.length)}
                                    </span>{" "}
                                    of <span className="font-medium">{filteredProfessors.length}</span> professors
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
                                        className={`p-2 rounded border border-gray-300 ${currentPage === 1
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            : "bg-white text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {Array.from({ length: Math.ceil(filteredProfessors.length / professorsPerPage) }).map((_, index) => (
                                        <button key={index} onClick={() => setCurrentPage(index + 1)} className={`px-3 py-1 rounded ${currentPage === index + 1
                                            ? "bg-blue-600 text-white"
                                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                                            }`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                    <button onClick={() => currentPage < Math.ceil(filteredProfessors.length / professorsPerPage) && setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(filteredProfessors.length / professorsPerPage)} className={`p-2 rounded border border-gray-300 ${currentPage === Math.ceil(filteredProfessors.length / professorsPerPage)
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

            {isAddProfModalOpen && (
                <AddProfModal isOpen={isAddProfModalOpen} onClose={() => setIsAddProfModalOpen(false)} onProfessorAdded={(profData, addAvailability) => {
                    setIsAddProfModalOpen(false);
                    fetchProfessors();
                    if (addAvailability) {
                        const profForAvailability = {
                            id: profData?.id || `temp-${Date.now()}`,
                            name: profData?.Name || profData?.name || "New Professor"
                        };
                        setSelectedProfForAvailability(profForAvailability);
                        setTimeout(() => {
                            setIsAvailabilityModalOpen(true);
                        }, 100);
                    }
                }}
                />
            )}

            {isEditModalOpen && selectedProf &&
                <EditProfModal professor={selectedProf} onClose={() => setIsEditModalOpen(false)} onUpdate={(data, successMsg) => {
                    setIsEditModalOpen(false);
                    fetchProfessors();
                    if (successMsg) {
                        showNotification(successMsg, "success");
                    }
                }}
                />
            }
            {isDeleteWarningOpen && <DeleteWarning isOpen={isDeleteWarningOpen} onClose={() => setIsDeleteWarningOpen(false)} onConfirm={handleConfirmDelete} message="Are you sure you want to remove this professor record?" />}

            {isAvailabilityModalOpen && selectedProfForAvailability && (
                <ProfAvailabilityModal isOpen={isAvailabilityModalOpen} onClose={() => setIsAvailabilityModalOpen(false)} professorId={selectedProfForAvailability.id} professorName={selectedProfForAvailability.name}
                />
            )}
            {isProfStatusModalOpen && (
                <ProfStatusModal isOpen={isProfStatusModalOpen} onClose={() => setIsProfStatusModalOpen(false)} onStatusesUpdated={() => {
                    fetchProfStatuses();
                    fetchProfessors();
                }}
                />
            )}
            {isAssignCourseModalOpen && selectedProfForCourse && (
                <AddAssignationModal isOpen={isAssignCourseModalOpen} onClose={() => setIsAssignCourseModalOpen(false)} onAssignationAdded={(newAssignation) => {
                    setIsAssignCourseModalOpen(false);
                    fetchDepartmentAssignations();
                    fetchProfessors();
                    showNotification("Course assigned successfully", "success");
                }} professorId={selectedProfForCourse.id} schoolYearId={selectedSchoolYears[selectedProfForCourse.id]}
                />
            )}
            {isDeleteAssignmentWarningOpen && (
                <DeleteWarning isOpen={isDeleteAssignmentWarningOpen} onClose={() => setIsDeleteAssignmentWarningOpen(false)} onConfirm={handleDeleteAssignment} title="Remove Course Assignment" message="Are you sure you want to remove this course assignment? This will update the professor's total units."
                />
            )}
        </div>
    );
}

export default ProfessorManagement;