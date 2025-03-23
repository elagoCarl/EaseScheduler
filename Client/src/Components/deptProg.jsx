import { useState, useEffect, } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Background from "./Img/1.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";

const DeptProg = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [formData, setFormData] = useState({
        Name: "",
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    // Toggle Sidebar Function
    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    // Fetch departments on component mount
    useEffect(() => {
        fetchDepartments();
    }, []);

    // Fetch all departments
    const fetchDepartments = () => {
        axios
            .get("http://localhost:8080/dept/getAllDept")
            .then((response) => {
                if (response.data.successful) {
                    setDepartments(response.data.data || []);
                } else {
                    console.error("Failed to fetch departments:", response.data.message);
                    setDepartments([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching departments:", error);
                setDepartments([]);
            });
    };

    // Handle input change
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle form submission (create or update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            let response;

            if (isEditing) {
                // Update existing department
                response = await axios.put(
                    `http://localhost:8080/dept/updateDept/${editingId}`,
                    formData
                );
            } else {
                // Create new department
                response = await axios.post(
                    "http://localhost:8080/dept/addDept",
                    formData
                );
            }

            setMessage({
                type: "success",
                text: response.data.message || (isEditing ? "Department updated successfully." : "Department created successfully.")
            });

            // Reset form after success
            setFormData({ Name: "" });
            setIsEditing(false);
            setEditingId(null);

            // Refresh departments list
            fetchDepartments();
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to process department.",
            });
        } finally {
            setLoading(false);
        }
    };

    // Edit department
    const handleEdit = (dept) => {
        setFormData({ Name: dept.Name });
        setIsEditing(true);
        setEditingId(dept.id);
    };

    // Cancel editing
    const handleCancel = () => {
        setFormData({ Name: "" });
        setIsEditing(false);
        setEditingId(null);
    };

    // Delete department
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this department?")) {
            try {
                const response = await axios.delete(
                    `http://localhost:8080/dept/deleteDept/${id}`
                );

                setMessage({
                    type: "success",
                    text: response.data.message || "Department deleted successfully."
                });

                // Refresh departments list
                fetchDepartments();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error.response?.data?.message || "Failed to delete department.",
                });
            }
        }
    };

    return (
        <div
            className="bg-cover bg-no-repeat min-h-screen flex justify-center items-center"
            style={{ backgroundImage: `url(${Background})` }}
        >
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Top Menu */}
            <TopMenu toggleSidebar={toggleSidebar} />

            {/* Content Container */}
            <div className="w-full max-w-6xl mx-4 my-20">
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="bg-customBlue1 from-blue-500 to-purple-600 p-6">
                        <h1 className="text-3xl font-bold text-white text-center">Department Management</h1>
                    </div>

                    <div className="flex flex-col lg:flex-row">
                        {/* Form Container */}
                        <div className="w-full lg:w-1/3 bg-gray-50 p-6">
                            <div className="bg-white rounded-lg shadow-lg p-6 transform transition-all hover:scale-105">
                                {/* Form Title */}
                                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                                    {isEditing ? "Edit Department" : "Create Department"}
                                </h2>

                                {/* Display Message */}
                                {message && (
                                    <div className={`mb-4 p-3 text-center rounded-lg text-white font-medium
                                        ${message.type === "success" ? "bg-customBlue1 from-green-400 to-green-600" : "bg-customBlue1 from-red-400 to-red-600"}`}>
                                        {message.text}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    {/* Department Name */}
                                    <div className="mb-4">
                                        <label className="block font-medium text-gray-700 mb-2" htmlFor="Name">
                                            Department Name
                                        </label>
                                        <input
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            id="Name"
                                            name="Name"
                                            type="text"
                                            placeholder="Enter department name"
                                            value={formData.Name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end mt-6 space-x-3">
                                        {isEditing && (
                                            <button
                                                type="button"
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                                                onClick={handleCancel}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            className="px-6 py-2 bg-customBlue1 from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
                                            type="submit"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Processing...
                                                </span>
                                            ) : isEditing ? "Update Department" : "Create Department"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Department List */}
                        <div className="w-full lg:w-2/3 p-6">
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Departments List</h2>

                                {departments.length === 0 ? (
                                    <div className="text-center py-10">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="mt-2 text-gray-500">No departments found.</p>
                                        <p className="text-sm text-gray-400">Create a new department to get started.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Name</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {departments.map((dept) => (
                                                    <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.id}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.Name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                            <button
                                                                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 mr-2 transition-colors"
                                                                onClick={() => handleEdit(dept)}
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                                                onClick={() => handleDelete(dept.id)}
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Delete
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
    );
};

export default DeptProg;