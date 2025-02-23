import { useState, useEffect } from "react";
import axios from "axios";
import Background from "./Img/5.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import LoadingSpinner from "./callComponents/loadingSpinner.jsx";
import ErrorDisplay from "./callComponents/errDisplay.jsx";
import profV from "./Img/profV.png";

const AssignedCoursesProf = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedProf, setSelectedProf] = useState("");
    const [professors, setProfessors] = useState([]);

    useEffect(() => {
        const fetchProfessors = async () => {
            setLoading(true);
            try {
                const response = await axios.get("http://localhost:8080/prof/getAllProf");

                // Extract the 'data' array from the response
                if (response.data && Array.isArray(response.data.data)) {
                    setProfessors(response.data.data);
                } else {
                    console.error("Unexpected API response:", response.data);
                    setProfessors([]); // Ensure it's an array
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
                        <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">Assigned Courses</h2>
                    </div>

                    <div className="overflow-auto w-full h-full flex-grow">
                        <table className="text-center w-full border-collapse">
                            <thead>
                                <tr className="bg-customLightBlue2">
                                    <th className="px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">Course</th>
                                    <th className="px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">Units</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Courses will be displayed after integrating assigned courses API */}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignedCoursesProf;
