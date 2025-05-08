import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "../../../axiosConfig";
import { useAuth } from '../../authContext';
import { X, Check, AlertCircle, Calendar } from "lucide-react";

const AddAssignationModal = ({ isOpen, onClose, onAssignationAdded, professorId }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        Semester: "",
        CourseId: "",
        ProfessorId: professorId ? professorId.toString() : "",
        DepartmentId: user.DepartmentId,
        RoomTypeId: ""
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [courses, setCourses] = useState([]);
    const [filteredAvailableCourses, setFilteredAvailableCourses] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [courseSearch, setCourseSearch] = useState("");
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [selectedCourseName, setSelectedCourseName] = useState("");
    const [willOverload, setWillOverload] = useState(false);
    const [selectedCourseUnits, setSelectedCourseUnits] = useState(0);
    const [selectedProfessorLoad, setSelectedProfessorLoad] = useState(0);
    const [profStatuses, setProfStatuses] = useState([]);
    const [maxAllowedUnits, setMaxAllowedUnits] = useState(0);
    const [departmentAssignations, setDepartmentAssignations] = useState([]);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    // Fetch assignations to check for already assigned courses
                    const assignationsResponse = await axios.get(`/assignation/getAllAssignationsByDept/${user.DepartmentId}`);
                    if (assignationsResponse.status === 200) {
                        setDepartmentAssignations(assignationsResponse.data.data);
                    } else {
                        setErrorMessage(assignationsResponse.data.message || "Failed to fetch assignations.");
                        return;
                    }

                    // Fetch courses by department ID instead of all courses
                    const coursesResponse = await axios.get(`course/getCoursesByDept/${user.DepartmentId}`)
                    if (coursesResponse.status === 200) {
                        setCourses(coursesResponse.data.data);
                    } else {
                        setErrorMessage(coursesResponse.data.message || "Failed to fetch courses.");
                        return;
                    }

                    // Fetch professors
                    const professorsResponse = await axios.get("/prof/getAllProf");
                    if (professorsResponse.status === 200) {
                        setProfessors(professorsResponse.data.data);
                    } else {
                        setErrorMessage(professorsResponse.data.message || "Failed to fetch professors.");
                        return;
                    }

                    // Fetch professor statuses
                    const statusesResponse = await axios.get("/profStatus/getAllStatus");
                    if (statusesResponse.status === 200) {
                        setProfStatuses(statusesResponse.data.data);
                    } else {
                        setErrorMessage(statusesResponse.data.message || "Failed to fetch professor statuses.");
                    }
                } catch (error) {
                    setErrorMessage(
                        error.response?.data?.message ||
                        error.message ||
                        "An error occurred while fetching data."
                    );
                }
            };

            fetchData();
        }
    }, [isOpen, user.DepartmentId]);

    // Filter available courses when courses or professor selection changes
    useEffect(() => {
        if (courses.length > 0 && departmentAssignations.length > 0 && formData.ProfessorId) {
            const profIdAsNumber = parseInt(formData.ProfessorId, 10);

            // Filter out courses that are already assigned to this professor
            const availableCourses = courses.filter(course => {
                // Check if this course is already assigned to this professor
                const isAlreadyAssigned = departmentAssignations.some(
                    assignment =>
                        assignment.ProfessorId === profIdAsNumber &&
                        assignment.CourseId === course.id
                );

                return !isAlreadyAssigned;
            });

            setFilteredAvailableCourses(availableCourses);
        } else {
            setFilteredAvailableCourses(courses);
        }
    }, [courses, departmentAssignations, formData.ProfessorId]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                Semester: "",
                CourseId: "",
                ProfessorId: professorId ? professorId.toString() : "",
                DepartmentId: user.DepartmentId,
                RoomTypeId: ""
            });
            setErrorMessage("");
            setSuccessMessage("");
            setCourseSearch("");
            setSelectedCourseName("");
            setWillOverload(false);
            setSelectedCourseUnits(0);
            setSelectedProfessorLoad(0);
            setMaxAllowedUnits(0);
        }
    }, [isOpen, user.DepartmentId, professorId]);

    // Check for overload when course or professor changes
    useEffect(() => {
        if (formData.CourseId && formData.ProfessorId) {
            const selectedCourse = courses.find(c => c.id === parseInt(formData.CourseId, 10));
            const selectedProfessor = professors.find(p => p.id === parseInt(formData.ProfessorId, 10));

            if (selectedCourse && selectedProfessor) {
                const courseUnits = selectedCourse.Units || 0;
                const professorCurrentLoad = selectedProfessor.Total_units || 0;

                setSelectedCourseUnits(courseUnits);
                setSelectedProfessorLoad(professorCurrentLoad);

                // Find the professor's status max units
                const professorStatus = profStatuses.find(status =>
                    status.Status === selectedProfessor.Status
                );

                const maxUnits = professorStatus ? professorStatus.Max_units : 24; // Default to 24 if not found
                setMaxAllowedUnits(maxUnits);

                // Check if this will cause an overload
                setWillOverload(professorCurrentLoad + courseUnits > maxUnits);
            }
        } else {
            setWillOverload(false);
            setSelectedCourseUnits(0);
            setSelectedProfessorLoad(0);
            setMaxAllowedUnits(0);
        }
    }, [formData.CourseId, formData.ProfessorId, courses, professors, profStatuses]);

    // Close course dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const courseDropdown = document.getElementById("course-dropdown-container");
            if (courseDropdown && !courseDropdown.contains(event.target)) {
                setShowCourseDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null; // Prevent rendering if the modal is not open

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    // Handle course search input change
    const handleCourseSearchChange = (e) => {
        setCourseSearch(e.target.value);
        setShowCourseDropdown(true);
    };

    // Select a course from the dropdown
    const handleCourseSelect = (course) => {
        setFormData({
            ...formData,
            CourseId: course.id.toString(),
        });
        setSelectedCourseName(`${course.Code} - ${course.Description} (${course.Units} units)`);
        setCourseSearch("");
        setShowCourseDropdown(false);
    };

    // Filter courses based on search input (from already filtered available courses)
    const filteredCourses = filteredAvailableCourses.filter(course =>
        course.Code.toLowerCase().includes(courseSearch.toLowerCase()) ||
        course.Description.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        setIsSubmitting(true);

        // Create a copy of formData to modify
        const submissionData = {
            ...formData,
            // Parse IDs to integers
            CourseId: parseInt(formData.CourseId, 10),
            ProfessorId: parseInt(formData.ProfessorId, 10),
            DepartmentId: parseInt(formData.DepartmentId, 10),
            RoomTypeId: formData.RoomTypeId ? parseInt(formData.RoomTypeId, 10) : null
        };

        try {
            const response = await axios.post(
                "/assignation/addAssignation",
                submissionData
            );

            if (response.status !== 200 && response.status !== 201) {
                setErrorMessage(response.data.message || "Failed to add assignation.");
                setIsSubmitting(false);
                return;
            }

            // Find the complete course and professor objects for the added assignation
            const selectedCourse = courses.find(c => c.id === submissionData.CourseId);
            const selectedProfessor = professors.find(p => p.id === submissionData.ProfessorId);
            const selectedRoomType = roomTypes.find(r => r.id === submissionData.RoomTypeId);

            // Construct the new assignation with full objects
            const newAssignation = {
                ...response.data.data, // If the API returns the created assignation
                id: response.data.data?.id,
                Course: selectedCourse,
                Professor: selectedProfessor,
                RoomType: selectedRoomType,
                Semester: submissionData.Semester
            };

            setSuccessMessage("Assignation added successfully!");

            // Notify parent component about the new assignation
            if (onAssignationAdded) {
                onAssignationAdded(newAssignation);
            }

            // Close modal after a brief delay so user can see success message
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                error.message ||
                "Failed to add assignation."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get limited academic years (current year - 1 to current year + 2)
    const currentYear = new Date().getFullYear();
    const academicYears = [];
    for (let year = currentYear - 1; year <= currentYear + 2; year++) {
        academicYears.push(`${year}-${year + 1}`);
    }

    // Calculate new total load
    const newTotalLoad = selectedProfessorLoad + selectedCourseUnits;

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md overflow-hidden transform transition-all">
                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl text-white font-semibold">Add Course Assignation</h2>
                    <button
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors duration-200"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form className="p-6 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Semester</label>
                        <select
                            name="Semester"
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={formData.Semester}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="" disabled>Select Semester</option>
                            <option value="1">1st Semester</option>
                            <option value="2">2nd Semester</option>
                        </select>
                    </div>

                    <div id="course-dropdown-container" className="space-y-1.5 relative">
                        <label className="block text-sm font-medium text-gray-700">Course</label>
                        <input
                            type="text"
                            placeholder="Search for a course..."
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={courseSearch}
                            onChange={handleCourseSearchChange}
                            onFocus={() => setShowCourseDropdown(true)}
                        />

                        {selectedCourseName && (
                            <div className="mt-2 text-white bg-blue-600 rounded p-2 flex justify-between items-center">
                                <span>{selectedCourseName}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCourseName("");
                                        setFormData({ ...formData, CourseId: "" });
                                    }}
                                    className="text-white hover:text-gray-300"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        {showCourseDropdown && (
                            <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-200 overflow-y-auto">
                                {filteredCourses.length > 0 ? (
                                    filteredCourses.map(course => (
                                        <div
                                            key={course.id}
                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                            onClick={() => handleCourseSelect(course)}
                                        >
                                            {course.Code} - {course.Description} ({course.Units} units)
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-2 text-gray-500">
                                        {formData.ProfessorId
                                            ? "No available courses for this professor"
                                            : "No courses found"}
                                    </div>
                                )}
                            </div>
                        )}

                        <input
                            type="hidden"
                            name="CourseId"
                            value={formData.CourseId}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Professor</label>
                        <select
                            name="ProfessorId"
                            className={`w-full p-2.5 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${willOverload ? 'border-yellow-500' : 'border-gray-300'}`}
                            value={formData.ProfessorId}
                            onChange={handleInputChange}
                            required
                            disabled={professorId !== undefined}
                        >
                            <option value="" disabled>
                                Select Professor
                            </option>
                            {professors.map((professor) => (
                                <option key={professor.id} value={professor.id}>
                                    {professor.Name} ({professor.Status}, Current Units: {professor.Total_units})
                                </option>
                            ))}
                        </select>

                        {/* Loading warning indicator */}
                        {willOverload && formData.ProfessorId && formData.CourseId && (
                            <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded flex items-start space-x-2">
                                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                <p className="text-sm">
                                    This will overload the professor ({selectedProfessorLoad} + {selectedCourseUnits} = {newTotalLoad} units, exceeds {maxAllowedUnits})
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start space-x-2">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{errorMessage}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start space-x-2">
                            <Check size={18} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{successMessage}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 transition duration-200"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                            {isSubmitting ? "Adding..." : "Add Assignation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddAssignationModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onAssignationAdded: PropTypes.func,
    professorId: PropTypes.number
};

export default AddAssignationModal;