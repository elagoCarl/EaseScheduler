import { useEffect, useState } from 'react';
import { X, BookOpen, Trash2, Plus } from 'lucide-react';
import Axios from '../../../axiosConfig';
import { toast } from 'react-toastify';
import { useAuth } from '../../authContext';

const CourseProgModal = ({ isOpen, onClose, courseId, courseName }) => {
    const { user } = useAuth();
    const departmentId = user?.DepartmentId;
    const [programs, setPrograms] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [adding, setAdding] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedYear, setSelectedYear] = useState(1);
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        console.log("Modal opened with courseId:", courseId);
        if (isOpen && courseId) {
            fetchProgramsForCourse(courseId);
            fetchDepartmentPrograms(departmentId);
        }
    }, [isOpen, courseId, departmentId]);

    const fetchProgramsForCourse = async (courseId) => {
        setLoading(true);
        try {
            const response = await Axios.get(`/courseProg/getProgramsByCourse/${courseId}`);
            if (response.data.successful) {
                // Store the CourseProg ID needed for deletion
                const formattedPrograms = response.data.data.map(program => ({
                    programId: program.id, // Program ID
                    courseProgramId: program.courseProgramId, // CourseProg ID
                    name: program.name || "Unnamed Program",
                    code: program.code || "",
                    year: program.year || null,
                    semester: program.semester || null
                }));

                setPrograms(formattedPrograms);
                console.log("Fetched associated programs:", formattedPrograms);
            } else {
                toast.error("Failed to fetch programs");
            }
        } catch (error) {
            toast.error("Error fetching programs for course");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartmentPrograms = async (deptId) => {
        if (!deptId) {
            console.log("No department ID available");
            return;
        }

        try {
            const response = await Axios.get(`/program/getAllProgByDept/${deptId}`);
            if (response.data.successful) {
                console.log("Fetched department programs:", response.data.data);
                setAllPrograms(response.data.data);
            } else {
                toast.error("Failed to fetch department programs");
            }
        } catch (error) {
            toast.error("Error fetching department programs");
            console.error(error);
        }
    };

    const handleDeleteCourseProg = async (courseProgramId) => {
        if (!confirm("Are you sure you want to remove this program association?")) {
            return;
        }

        setDeleting(courseProgramId);
        try {
            const response = await Axios.delete(`/courseProg/deleteCourseProg/${courseProgramId}`);
            if (response.data.successful) {
                toast.success("Program association removed successfully");
                // Remove the deleted program from state
                setPrograms(prevPrograms =>
                    prevPrograms.filter(program => program.courseProgramId !== courseProgramId)
                );
            } else {
                toast.error(response.data.message || "Failed to remove program association");
            }
        } catch (error) {
            toast.error("Error removing program association");
            console.error(error);
        } finally {
            setDeleting(null);
        }
    };

    const handleAddCourseProg = async (e) => {
        e.preventDefault();
        if (!selectedProgram || !selectedYear || !selectedSemester) {
            toast.error("Please select a program, year, and semester");
            return;
        }

        setAdding(true);
        try {
            const response = await Axios.post('/courseProg/addCourseProg', {
                CourseId: courseId,
                ProgramId: selectedProgram,
                Year: selectedYear,
                Semester: selectedSemester
            });

            if (response.data.successful) {
                toast.success("Program associated successfully");
                fetchProgramsForCourse(courseId); // Refresh the list
                setSelectedProgram(''); // Reset form
                setSelectedYear(1);
                setSelectedSemester(1);
                setShowAddForm(false);
            } else {
                toast.error(response.data.message || "Failed to associate program");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Error associating program with course");
            console.error(error);
        } finally {
            setAdding(false);
        }
    };

    // Get all programs from the department - no need to filter
    // since a program can be associated with a course in different years
    const getAvailablePrograms = () => {
        if (!allPrograms || allPrograms.length === 0) {
            return [];
        }

        return allPrograms;
    };

    const availablePrograms = getAvailablePrograms();
    console.log("Available programs for dropdown:", availablePrograms);

    if (!isOpen) return null;

    // Group programs by year and semester
    const programsByYearAndSemester = {};
    programs.forEach(program => {
        const year = program.year || 'Unspecified';
        const semester = program.semester || 'Unspecified';
        const key = `${year}-${semester}`;

        if (!programsByYearAndSemester[key]) {
            programsByYearAndSemester[key] = {
                year,
                semester,
                programs: []
            };
        }
        programsByYearAndSemester[key].programs.push(program);
    });

    // Sort groups by year then semester
    const sortedGroups = Object.values(programsByYearAndSemester).sort((a, b) => {
        if (a.year === 'Unspecified') return 1;
        if (b.year === 'Unspecified') return -1;
        if (parseInt(a.year) !== parseInt(b.year)) {
            return parseInt(a.year) - parseInt(b.year);
        }
        if (a.semester === 'Unspecified') return 1;
        if (b.semester === 'Unspecified') return -1;
        return parseInt(a.semester) - parseInt(b.semester);
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                        <BookOpen className="text-blue-600" size={20} />
                        <h2 className="text-lg font-semibold text-gray-800">
                            Associated Programs - {courseName}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {/* Add Program Button */}
                    <div className="mb-4">
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} />
                            <span>{showAddForm ? "Cancel" : "Add Program Association"}</span>
                        </button>
                    </div>

                    {/* Add Program Form */}
                    {showAddForm && (
                        <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Program Association</h4>
                            <form onSubmit={handleAddCourseProg} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Program
                                    </label>
                                    <select
                                        value={selectedProgram}
                                        onChange={(e) => setSelectedProgram(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        required
                                    >
                                        <option value="">Select a program</option>
                                        {availablePrograms && availablePrograms.length > 0 ? (
                                            availablePrograms.map(program => (
                                                <option key={program.id} value={program.id}>
                                                    {program.Name} ({program.Code})
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No available programs</option>
                                        )}
                                    </select>
                                    {/* A program can be associated with a course in different years */}
                                    {(!availablePrograms || availablePrograms.length === 0) &&
                                        (!allPrograms || allPrograms.length === 0) && (
                                            <p className="text-xs text-orange-500 mt-1">
                                                No programs found for this department
                                            </p>
                                        )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Year
                                    </label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        required
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(year => (
                                            <option key={year} value={year}>
                                                Year {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Semester
                                    </label>
                                    <select
                                        value={selectedSemester}
                                        onChange={(e) => setSelectedSemester(Number(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        required
                                    >
                                        <option value={1}>Semester 1</option>
                                        <option value={2}>Semester 2</option>
                                    </select>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={adding || !selectedProgram || availablePrograms.length === 0}
                                        className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors
                                            ${(adding || !selectedProgram || availablePrograms.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {adding ? (
                                            <span className="flex items-center">
                                                <div className="w-4 h-4 mr-2 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                                                Adding...
                                            </span>
                                        ) : (
                                            "Associate Program"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                        </div>
                    ) : programs.length > 0 ? (
                        <div className="space-y-4">
                            {sortedGroups.map(group => (
                                <div key={`year-${group.year}-semester-${group.semester}`} className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">
                                        {group.year === 'Unspecified' ? 'Year: Unspecified' : `Year ${group.year}`}
                                        {' - '}
                                        {group.semester === 'Unspecified' ? 'Semester: Unspecified' : `Semester ${group.semester}`}
                                    </h4>
                                    <div className="space-y-2">
                                        {group.programs.map(program => (
                                            <div
                                                key={`program-${program.programId}-${program.courseProgramId}`}
                                                className="bg-gray-50 p-3 rounded border border-gray-100 hover:border-blue-200 transition-colors"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-800">{program.name}</h4>
                                                        {program.code && <p className="text-xs text-gray-500">{program.code}</p>}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteCourseProg(program.courseProgramId)}
                                                        disabled={deleting === program.courseProgramId}
                                                        className={`text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 
                                                            ${deleting === program.courseProgramId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        title="Remove program association"
                                                    >
                                                        {deleting === program.courseProgramId ? (
                                                            <div className="w-4 h-4 border-t-2 border-red-500 border-solid rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Trash2 size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-200">
                            <p className="text-gray-500">No programs associated with this course</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseProgModal;