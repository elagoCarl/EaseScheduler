import { useState, useEffect } from "react";
import axios from "axios";
import Background from "./Img/5.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import LoadingSpinner from "./callComponents/loadingSpinner.jsx";
import ErrorDisplay from "./callComponents/errDisplay.jsx";
import profV from "./Img/profV.png";
import addBtn from "./Img/addBtn.png";
import delBtn from "./Img/delBtn.png";
import AssignCourseToProfModal from "../Components/callComponents/assignCourseToProfModal.jsx";
import DeleteWarning from "./callComponents/deleteWarning.jsx";

const AssignedCoursesProf = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedProf, setSelectedProf] = useState("");
    const [professors, setProfessors] = useState([]);
    const [isAssignCourseToProfModalOpen, setIsAssignCourseToProfModalOpen] = useState(false);
    const [checkboxes, setCheckboxes] = useState([]);
    const [isAllChecked, setAllChecked] = useState(false);
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
    const [isDeleteBtnDisabled, setDeleteBtnDisabled] = useState(true);

    // Fetch professors on component mount
    useEffect(() => {
        const fetchProfessors = async () => {
            setLoading(true);
            try {
                const response = await axios.get("http://localhost:8080/prof/getAllProf");
                if (response.data && Array.isArray(response.data.data)) {
                    setProfessors(response.data.data);
                } else {
                    console.error("Unexpected API response:", response.data);
                    setProfessors([]);
                }
            } catch (err) {
                console.error("Error fetching professors:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProfessors();
    }, []);

    // Fetch assigned courses when professor is selected
    useEffect(() => {
        if (selectedProf) {
            fetchAssignedCourses(selectedProf);
        } else {
            setAssignedCourses([]);
        }
    }, [selectedProf]);

    const fetchAssignedCourses = async (id) => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:8080/course/getCoursesByProf/${id}`);
            if (response.data.successful) {
                setAssignedCourses(response.data.data);
                setCheckboxes(new Array(response.data.data.length).fill(false));
            } else {
                setAssignedCourses([]);
            }
        } catch (err) {
            console.error("Error fetching assigned courses:", err);
            setError(err.message);
            setAssignedCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMasterCheckboxChange = () => {
        const newState = !isAllChecked;
        setAllChecked(newState);
        setCheckboxes(checkboxes.map(() => newState));
        setDeleteBtnDisabled(!newState);
    };

    const handleCheckboxChange = (index) => {
        const updatedCheckboxes = [...checkboxes];
        updatedCheckboxes[index] = !updatedCheckboxes[index];
        setCheckboxes(updatedCheckboxes);
        setAllChecked(updatedCheckboxes.every((isChecked) => isChecked));

        const anyChecked = updatedCheckboxes.some((isChecked) => isChecked);
        setDeleteBtnDisabled(!anyChecked);
    };

    const handleDeleteClick = () => {
        setIsDeleteWarningOpen(true);
    };

    const handleCloseDelWarning = () => {
        setIsDeleteWarningOpen(false);
    };

    const handleConfirmDelete = async () => {
        const coursesToDelete = assignedCourses
            .filter((_, index) => checkboxes[index])
            .map((course) => course.id);

        if (coursesToDelete.length === 0) {
            console.error("No courses selected for deletion.");
            return;
        }

        try {
            // Process each course deletion separately
            for (const courseId of coursesToDelete) {
                const requestBody = {
                    courseId: courseId,
                    profId: parseInt(selectedProf, 10)  // Convert string to number
                };

                console.log("Deleting course assignment:", requestBody);

                const response = await axios({
                    method: 'delete',
                    url: 'http://localhost:8080/prof/deleteCourseProf',
                    data: requestBody,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log("Delete response:", response.data);
            }

            // Refresh the list after successful deletion
            await fetchAssignedCourses(selectedProf);

            // Reset UI state
            setCheckboxes(new Array(assignedCourses.length - coursesToDelete.length).fill(false));
            setAllChecked(false);
            setDeleteBtnDisabled(true);
            setIsDeleteWarningOpen(false);

        } catch (error) {
            console.error("Error unassigning courses:", error);
            console.error("Error details:", error.response ? error.response.data : "No response data");
            setError("Failed to unassign course: " + (error.response ? error.response.data.message : error.message));
        }
    };

    const handleAssignModalOpen = () => {
        if (selectedProf) {
            setIsAssignCourseToProfModalOpen(true);
        }
    };

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorDisplay error={error} />;

    return (
        <div
            className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
            style={{ backgroundImage: `url(${Background})` }}
        >
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <TopMenu toggleSidebar={toggleSidebar} />

            <div className="flex flex-col justify-center items-center h-screen w-full px-8">
                <div className="flex justify-end w-10/12 mb-4">
                    <div className="flex gap-4">
                        <select
                            value={selectedProf}
                            onChange={(e) => setSelectedProf(e.target.value)}
                            className="px-4 py-2 border rounded text-sm md:text-base"
                        >
                            <option value="">Select Professor</option>
                            {professors.map((prof) => (
                                <option key={prof.id} value={prof.id}>
                                    {prof.Name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-10/12 max-h-[70vh]">
                    <div className="flex items-center bg-customBlue1 text-white px-4 md:px-10 py-4 rounded-t-lg w-full">
                        <img src={profV} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Professor Icon" />
                        <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">Assigned Courses To Professors</h2>
                    </div>

                    <div className="overflow-auto w-full h-full flex-grow">
                        <table className="text-center w-full border-collapse">
                            <thead>
                                <tr className="bg-customLightBlue2">
                                    <th className="px-4 py-2 text-gray-600 border">Code</th>
                                    <th className="px-4 py-2 text-gray-600 border">Description</th>
                                    <th className="px-4 py-2 text-gray-600 border">Duration</th>
                                    <th className="px-4 py-2 text-gray-600 border">Units</th>
                                    <th className="px-4 py-2 text-gray-600 border">Type</th>
                                    <th className="px-4 py-2 text-gray-600 border">
                                        <input type="checkbox" checked={isAllChecked} onChange={handleMasterCheckboxChange} />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignedCourses.map((course, index) => (
                                    <tr key={course.id} className="hover:bg-customLightBlue2 border-t border-gray-300">
                                        <td className="px-4 py-2 border">{course.Code}</td>
                                        <td className="px-4 py-2 border">{course.Description}</td>
                                        <td className="px-4 py-2 border">{course.Duration}</td>
                                        <td className="px-4 py-2 border">{course.Units}</td>
                                        <td className="px-4 py-2 border">{course.Type}</td>
                                        <td className="py-2 border">
                                            <input
                                                type="checkbox"
                                                checked={checkboxes[index] || false}
                                                onChange={() => handleCheckboxChange(index)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="fixed top-1/4 right-4 border border-gray-900 bg-customWhite rounded p-4 flex flex-col gap-4">
                <button
                    className="py-2 px-4 text-white rounded"
                    onClick={handleAssignModalOpen}
                >
                    <img src={addBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Assign Course to Prof" />
                </button>
                <button
                    className="py-2 px-4 text-white rounded"
                    onClick={handleDeleteClick}
                    disabled={isDeleteBtnDisabled}
                >
                    <img src={delBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Delete Assignment" />
                </button>
            </div>

            <AssignCourseToProfModal
                isOpen={isAssignCourseToProfModalOpen || false}  // Ensure boolean value
                onClose={() => setIsAssignCourseToProfModalOpen(false)}
                selectedProfId={selectedProf || ""}  // Ensure string value
                onAssign={() => fetchAssignedCourses(selectedProf)}
            />

            <DeleteWarning
                isOpen={isDeleteWarningOpen}
                onClose={handleCloseDelWarning}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
};

export default AssignedCoursesProf;