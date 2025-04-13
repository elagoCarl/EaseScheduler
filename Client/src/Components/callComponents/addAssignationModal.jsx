import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "../../axiosConfig";
import { useAuth } from '../authContext';

const AddAssignationModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        School_Year: "",
        Semester: "",
        CourseId: "",
        ProfessorId: "",
        DepartmentId: user.DepartmentId,
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [courses, setCourses] = useState([]);
    const [professors, setProfessors] = useState([]);

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

    if (!isOpen) return null; // Prevent rendering if the modal is not open

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        
        // Create a copy of formData to modify
        const submissionData = {
            ...formData,
            // Parse CourseId and ProfessorId to integers
            CourseId: parseInt(formData.CourseId, 10),
            ProfessorId: parseInt(formData.ProfessorId, 10),
            // If DepartmentId should also be an integer, parse it too
            DepartmentId: parseInt(formData.DepartmentId, 10)
        };
        
        console.log("Submission data:", submissionData);

        try {
            const response = await axios.post(
                "/assignation/addAssignation",
                submissionData
            );

            if (response.status !== 200 && response.status !== 201) {
                setErrorMessage(response.data.message || "Failed to add assignation.");
                return;
            }

            setSuccessMessage("Assignation added successfully! Reloading page...");
            setTimeout(() => {
                onClose(); // Close the modal after a short delay
                window.location.reload(); // Reload the page to reflect the changes
            }, 1000); // Wait 1 second before closing the modal and reloading the page
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                error.message ||
                "Failed to add assignation."
            );
        }
    };

    // Get limited academic years (current year - 1 to current year + 2)
    const currentYear = new Date().getFullYear();
    const academicYears = [];
    for (let year = currentYear - 1; year <= currentYear + 2; year++) {
        academicYears.push(`${year}-${year + 1}`);
    }

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-2/3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Add Course Assignation</h2>
                    <button
                        className="text-xl text-white hover:text-black"
                        onClick={onClose}
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
                            >
                                <option value="" disabled>
                                    Select Semester
                                </option>
                                <option value="1">First Semester</option>
                                <option value="2">Second Semester</option>
                                <option value="Summer">Summer</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-white">Course</label>
                            <select
                                name="CourseId"
                                className="w-full p-3 border rounded bg-customWhite"
                                value={formData.CourseId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="" disabled>
                                    Select Course
                                </option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.Code} - {course.Description} ({course.Units} units)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-white">Professor</label>
                            <select
                                name="ProfessorId"
                                className="w-full p-3 border rounded bg-customWhite"
                                value={formData.ProfessorId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="" disabled>
                                    Select Professor
                                </option>
                                {professors.map((professor) => (
                                    <option key={professor.id} value={professor.id}>
                                        {professor.Name} (Current Units: {professor.Total_units})
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
                        >
                            Add Assignation
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg"
                            onClick={onClose}
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
};

export default AddAssignationModal;