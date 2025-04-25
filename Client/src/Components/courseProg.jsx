import { useState, useEffect } from "react";
import axios from "../axiosConfig.js";
import Background from "./Img/1.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import { useAuth } from '../Components/authContext.jsx';

const CourseProg = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [coursesByProgram, setCoursesByProgram] = useState([]);
    const [courseProgFormData, setCourseProgFormData] = useState({
        programId: "",
        courseId: ""
    });
    const [isEditing, setIsEditing] = useState(false);
    const [oldCourseId, setOldCourseId] = useState(null);
    const [oldProgId, setOldProgId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState("courses-list");
    const [selectedProgram, setSelectedProgram] = useState("");
    const { user } = useAuth();

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Fetch initial data when user changes
    useEffect(() => {
        if (user?.DepartmentId) {
            fetchPrograms();
            fetchCourses();
        }
    }, [user]);

    // Fetch data functions
    const fetchPrograms = async () => {
        try {
            const response = await axios.get(`/program/getAllProgByDept/${user.DepartmentId}`);
            console.log("Programs response:", response.data);
            console.log("User DepartmentId:", user.DepartmentId);
            setPrograms(response.data.successful ? response.data.data || [] : []);
        } catch (error) {
            console.error("Error fetching programs:", error);
            setPrograms([]);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await axios.get(`/course/getCoursesByDept/${user.DepartmentId}`);
            setCourses(response.data.successful ? response.data.data || [] : []);
        } catch (error) {
            console.error("Error fetching courses:", error);
            setCourses([]);
        }
    };

    const fetchCoursesByProgram = async (programId) => {
        if (!programId) {
            setCoursesByProgram([]);
            return;
        }

        try {
            const progId = parseInt(programId);
            const response = await axios.get(`/program/getCoursesByProg/${progId}`);
            setCoursesByProgram(response.data.successful ? response.data.data || [] : []);
        } catch (error) {
            console.error("Error fetching courses by program:", error);
            setCoursesByProgram([]);
        }
    };

    // Event handlers
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    const handleProgramChange = (e) => {
        const programId = e.target.value;
        const parsedId = programId ? parseInt(programId) : "";
        setSelectedProgram(parsedId);
        fetchCoursesByProgram(programId);
        setCourseProgFormData(prev => ({ ...prev, programId: parsedId }));
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        const parsedValue = (name === "programId" || name === "courseId")
            ? (value ? parseInt(value) : "")
            : value;
        setCourseProgFormData(prev => ({ ...prev, [name]: parsedValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            let response;

            if (isEditing) {
                response = await axios.put("/program/updateCourseProg", {
                    oldCourseId: parseInt(oldCourseId),
                    oldProgId: parseInt(oldProgId),
                    newCourseId: parseInt(courseProgFormData.courseId),
                    newProgId: parseInt(courseProgFormData.programId)
                });
            } else {
                response = await axios.post("/program/addCourseProg", {
                    courseId: parseInt(courseProgFormData.courseId),
                    programId: parseInt(courseProgFormData.programId)
                });
            }

            setMessage({
                type: "success",
                text: response.data.message || (isEditing ? "Course-Program mapping updated successfully." : "Course added to program successfully."),
            });
            setTimeout(() => {
                setMessage(null);
            }, 1000);

            resetForm();
            if (selectedProgram) {
                fetchCoursesByProgram(selectedProgram);
            }
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to process course-program mapping.",
            });
            setTimeout(() => {
                setMessage(null);
            }, 1000);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCourseProgFormData({
            programId: selectedProgram || "",
            courseId: ""
        });
        setIsEditing(false);
        setOldCourseId(null);
        setOldProgId(null);
    };

    const handleCancel = () => {
        resetForm();
    };

    const handleEdit = (course, programId) => {
        setCourseProgFormData({
            programId: parseInt(programId),
            courseId: parseInt(course.id)
        });
        setIsEditing(true);
        setOldCourseId(parseInt(course.id));
        setOldProgId(parseInt(programId));

        if (window.innerWidth < 768) setActiveTab("courses-form");
    };

    // Updated delete handling with confirmation modal
    const initiateDelete = (courseId, programId) => {
        // Store item to delete for reference
        setItemToDelete({ courseId, programId });

        // Set the confirm action function
        setConfirmAction(() => () => executeDelete(courseId, programId));

        // Show the confirmation modal
        setShowConfirmModal(true);
    };

    const executeDelete = async (courseId, programId) => {
        try {
            const response = await axios.delete("/program/deleteCourseProg", {
                data: {
                    courseId: parseInt(courseId),
                    progId: parseInt(programId)
                }
            });

            setMessage({
                type: "success",
                text: response.data.message || "Course removed from program successfully.",
            });
            setTimeout(() => {
                setMessage(null);
            }, 1000);

            if (selectedProgram) fetchCoursesByProgram(selectedProgram);
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to remove course from program.",
            });
            setTimeout(() => {
                setMessage(null);
            }, 1000);
        } finally {
            // Reset confirmation state
            setShowConfirmModal(false);
            setConfirmAction(null);
            setItemToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowConfirmModal(false);
        setConfirmAction(null);
        setItemToDelete(null);
    };

    // Helper function
    const getProgramName = (programId) => {
        const program = programs.find(p => p.id === parseInt(programId));
        return program ? `${program.Code} - ${program.Name}` : "Unknown Program";
    };

    const getCourseName = (courseId) => {
        const course = courses.find(c => c.id === parseInt(courseId));
        return course ? `${course.Code} - ${course.Description}` : "Unknown Course";
    };

    return (
        <div className="bg-cover bg-no-repeat min-h-screen flex justify-center items-center p-20" style={{ backgroundImage: `url(${Background})` }}>
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <TopMenu toggleSidebar={toggleSidebar} />

            <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto my-8 md:my-20">
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                    <div className="bg-blue-600 p-4 sm:p-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">Course-Program Management</h1>
                    </div>

                    <div className="p-4 sm:p-6">
                        {message && (
                            <div className={`mb-4 p-3 text-center rounded-lg text-white font-medium ${message.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Program Selection Dropdown */}
                        <div className="mb-6">
                            <label htmlFor="programSelector" className="block font-medium text-gray-700 mb-2">Select Program</label>
                            <select
                                id="programSelector"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                value={selectedProgram}
                                onChange={handleProgramChange}
                            >
                                <option value="">-- Select Program --</option>
                                {programs.map(program => (
                                    <option key={program.id} value={program.id}>
                                        {program.Code} - {program.Name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Mobile Tab Navigation */}
                        <div className="flex md:hidden mb-4 border-b">
                            <button
                                className={`w-1/2 py-2 text-center ${activeTab === 'courses-form' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}
                                onClick={() => setActiveTab("courses-form")}
                            >
                                {isEditing ? "Edit Course-Program" : "Add Course to Program"}
                            </button>
                            <button
                                className={`w-1/2 py-2 text-center ${activeTab === 'courses-list' ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-500'}`}
                                onClick={() => setActiveTab("courses-list")}
                            >
                                Program Courses
                            </button>
                        </div>

                        {/* Main Content */}
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                            {/* Course-Program Form */}
                            <div className={`w-full md:w-1/3 bg-gray-50 p-4 sm:p-6 rounded-lg shadow ${activeTab !== 'courses-form' && 'hidden md:block'}`}>
                                <h3 className="text-lg sm:text-xl font-bold mb-4 border-b pb-2">
                                    {isEditing ? "Update Course-Program Mapping" : "Add Course to Program"}
                                </h3>
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label htmlFor="courseId" className="block font-medium text-gray-700 mb-2">Course</label>
                                        <select
                                            id="courseId"
                                            name="courseId"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={courseProgFormData.courseId}
                                            onChange={handleFormChange}
                                            required
                                        >
                                            <option value="">-- Select Course --</option>
                                            {courses.map(course => (
                                                <option key={course.id} value={course.id}>
                                                    {course.Code} - {course.Description}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="programId" className="block font-medium text-gray-700 mb-2">Program</label>
                                        <select
                                            id="programId"
                                            name="programId"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={courseProgFormData.programId}
                                            onChange={handleFormChange}
                                            required
                                        >
                                            <option value="">-- Select Program --</option>
                                            {programs.map(program => (
                                                <option key={program.id} value={program.id}>
                                                    {program.Code} - {program.Name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end mt-6 space-x-3">
                                        {isEditing && (
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="px-3 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-4 sm:px-6 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 transition"
                                        >
                                            {loading ? "Processing..." : isEditing ? "Update" : "Add"}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Courses List */}
                            <div className={`w-full md:w-2/3 ${activeTab !== 'courses-list' && 'hidden md:block'}`}>
                                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                                    <h3 className="text-lg sm:text-xl font-bold mb-4 border-b pb-2">
                                        {selectedProgram ? `Courses in ${getProgramName(selectedProgram)}` : "Program Courses"}
                                    </h3>
                                    {!selectedProgram ? (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500">Please select a program to view its courses.</p>
                                        </div>
                                    ) : coursesByProgram.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500">No courses found for this program. Add courses to get started.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto max-h-160 overflow-y-auto">
                                            <table className="w-full">
                                                <thead className="sticky top-0 bg-white">
                                                    <tr className="bg-gray-50">
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                                                        <th className="px-2 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {coursesByProgram.map(course => (
                                                        <tr key={course.id} className="border-b hover:bg-gray-50 transition">
                                                            <td className="px-2 sm:px-4 py-3 text-sm font-medium text-gray-900">
                                                                {course.Code} - {course.Description}
                                                            </td>
                                                            <td className="px-2 sm:px-4 py-3 text-sm text-gray-600">
                                                                {getProgramName(selectedProgram)}
                                                            </td>
                                                            <td className="px-2 sm:px-4 py-3 text-sm text-center">
                                                                <button
                                                                    className="inline-block px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded mr-1 sm:mr-2 hover:bg-blue-200"
                                                                    onClick={() => handleEdit(course, selectedProgram)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="inline-block px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                                    onClick={() => initiateDelete(course.id, selectedProgram)}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 animate-fade-in">
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-4">
                            </div>
                            <h3 className="text-lg text-start font-medium text-gray-900 mb-2">Confirm Removal</h3>
                            {itemToDelete && (
                                <p className="text-md w-11/12 text-start text-gray-500 mb-6">
                                    Are you sure you want to remove this course from the program? This action cannot be undone.
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end space-x-4 mb-2">
                            <button
                                onClick={cancelDelete}
                                className="px-8 py-2 bg-gray-300 duration-300 text-gray-800 rounded hover:bg-gray-400 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                className="px-4 py-2 bg-red-600 duration-300 text-white rounded hover:bg-red-700 transition"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseProg;