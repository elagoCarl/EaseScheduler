import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "../../axiosConfig";
import { useAuth } from '../authContext';

const AddAssignationModal = ({ isOpen, onClose, onAssignationAdded }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        School_Year: "",
        Semester: "",
        CourseId: "",
        ProfessorId: "",
        DepartmentId: user.DepartmentId,
        RoomTypeId: ""
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [courses, setCourses] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New state variables for searchable course dropdown
    const [courseSearch, setCourseSearch] = useState("");
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [selectedCourseName, setSelectedCourseName] = useState("");

    // New state for load warning
    const [willOverload, setWillOverload] = useState(false);
    const [selectedCourseUnits, setSelectedCourseUnits] = useState(0);
    const [selectedProfessorLoad, setSelectedProfessorLoad] = useState(0);
    const [profStatuses, setProfStatuses] = useState([]);
    const [maxAllowedUnits, setMaxAllowedUnits] = useState(0);

    // Fetch necessary data when the modal is opened
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
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

                    // Fetch room types
                    const roomTypesResponse = await axios.get("/roomType/getAllRoomTypes");
                    if (roomTypesResponse.status === 200) {
                        setRoomTypes(roomTypesResponse.data.data);
                    } else {
                        setErrorMessage(roomTypesResponse.data.message || "Failed to fetch room types.");
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

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                School_Year: "",
                Semester: "",
                CourseId: "",
                ProfessorId: "",
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
    }, [isOpen, user.DepartmentId]);

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

    // Filter courses based on search input
    const filteredCourses = courses.filter(course =>
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

        console.log("Submission data:", submissionData);

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
                School_Year: submissionData.School_Year,
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
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-2/3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Add Course Assignation</h2>
                    <button
                        className="text-xl text-white hover:text-black"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        &times;
                    </button>
                </div>
                <form className="space-y-6 px-10" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block font-semibold text-white">Academic Year</label>
                            <select
                                name="School_Year"
                                className="w-full p-3 border rounded bg-customWhite"
                                value={formData.School_Year}
                                onChange={handleInputChange}
                                required
                                disabled={isSubmitting}
                            >
                                <option value="" disabled>
                                    Select Academic Year
                                </option>
                                {academicYears.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-white">Semester</label>
                            <select
                                name="Semester"
                                className="w-full p-3 border rounded bg-customWhite"
                                value={formData.Semester}
                                onChange={handleInputChange}
                                required
                                disabled={isSubmitting}
                            >
                                <option value="" disabled>
                                    Select Semester
                                </option>
                                <option value="1">First Semester</option>
                                <option value="2">Second Semester</option>
                                <option value="Summer">Summer</option>
                            </select>
                        </div>

                        <div id="course-dropdown-container" className="relative">
                            <label className="block font-semibold text-white">Course</label>
                            <div className="flex flex-col">
                                <input
                                    type="text"
                                    placeholder="Search for a course..."
                                    className="w-full p-3 border rounded bg-customWhite"
                                    value={courseSearch}
                                    onChange={handleCourseSearchChange}
                                    onFocus={() => setShowCourseDropdown(true)}
                                    disabled={isSubmitting}
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
                                    <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto top-full">
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
                                            <div className="p-2 text-gray-500">No courses found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <input
                                type="hidden"
                                name="CourseId"
                                value={formData.CourseId}
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-white">Professor</label>
                            <div className="relative">
                                <select
                                    name="ProfessorId"
                                    className={`w-full p-3 border rounded bg-customWhite ${willOverload ? 'border-yellow-500' : ''}`}
                                    value={formData.ProfessorId}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
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

                                {willOverload && formData.ProfessorId && formData.CourseId && (
                                    <div className="absolute top-0 right-0 h-full flex items-center pr-3">
                                        <div className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center" title={`Will exceed maximum load (${maxAllowedUnits} units)`}>
                                            !
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Loading warning indicator */}
                            {willOverload && formData.ProfessorId && formData.CourseId && (
                                <div className="mt-2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>
                                        This will overload the professor ({selectedProfessorLoad} + {selectedCourseUnits} = {newTotalLoad} units, exceeds {maxAllowedUnits})
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block font-semibold text-white">Room Type</label>
                            <select
                                name="RoomTypeId"
                                className="w-full p-3 border rounded bg-customWhite"
                                value={formData.RoomTypeId}
                                onChange={handleInputChange}
                                disabled={isSubmitting}
                            >
                                <option value="">Select Room Type (Optional)</option>
                                {roomTypes.map((roomType) => (
                                    <option key={roomType.id} value={roomType.id}>
                                        {roomType.Type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Hidden field for department ID */}
                    <input
                        type="hidden"
                        name="DepartmentId"
                        value={formData.DepartmentId}
                    />

                    {errorMessage && (
                        <p className="text-red-500 text-center">{errorMessage}</p>
                    )}

                    {successMessage && (
                        <p className="text-green-500 text-center">{successMessage}</p>
                    )}

                    <div className="flex justify-center mt-6 gap-4">
                        <button
                            type="submit"
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Assignation'}
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
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
    onAssignationAdded: PropTypes.func
};

export default AddAssignationModal;