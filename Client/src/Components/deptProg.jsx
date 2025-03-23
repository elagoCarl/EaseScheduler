import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Background from "./Img/1.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";

const DeptProg = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // DEPARTMENT STATES & CRUD
    const [departments, setDepartments] = useState([]);
    const [deptFormData, setDeptFormData] = useState(
        {
            Name: ""
        });
    const [isDeptEditing, setIsDeptEditing] = useState(false);
    const [deptEditingId, setDeptEditingId] = useState(null);


    // PROGRAM STATES & CRUD
    const [programs, setPrograms] = useState([]);
    const [progFormData, setProgFormData] = useState(
        {
            Code: "",
            Name: "",
            DepartmentId: "",
        });
    const [isProgEditing, setIsProgEditing] = useState(false);
    const [progEditingId, setProgEditingId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    // Toggle Sidebar
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        fetchDepartments();
        fetchPrograms();
    }, []);

    // Get all Departments
    const fetchDepartments = async () => {
        try {
            const response = await axios.get("http://localhost:8080/dept/getAllDept");
            if (response.data.successful) {
                setDepartments(response.data.data || []);
            } else {
                console.error("Failed to fetch departments:", response.data.message);
                setDepartments([]);
            }
        } catch (error) {
            console.error("Error fetching departments:", error);
            setDepartments([]);
        }
    };

    // pangkuha ng kabuoan ng programs
    const fetchPrograms = async () => {
        try {
            const response = await axios.get("http://localhost:8080/program/getAllProgram");
            if (response.data.successful) {
                setPrograms(response.data.data || []);
            } else {
                console.error("Failed to fetch programs:", response.data.message);
                setPrograms([]);
            }
        } catch (error) {
            console.error("Error fetching programs:", error);
            setPrograms([]);
        }
    };

    const handleDeptChange = (e) => {
        setDeptFormData({ ...deptFormData, [e.target.name]: e.target.value });
    };

    const handleDeptSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            let response;
            if (isDeptEditing) {
                // Update existing department
                response = await axios.put(
                    `http://localhost:8080/dept/updateDept/${ deptEditingId }`,
                    deptFormData
                );
            } else {
                // Create new department
                response = await axios.post(
                    "http://localhost:8080/dept/addDept",
                    deptFormData
                );
            }

            setMessage({
                type: "success",
                text:
                    response.data.message ||
                    (isDeptEditing
                        ? "Department updated successfully."
                        : "Department created successfully."),
            });

            // Reset department form
            setDeptFormData({ Name: "" });
            setIsDeptEditing(false);
            setDeptEditingId(null);

            // Refresh list
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

    const handleDeptEdit = (dept) => {
        setDeptFormData({ Name: dept.Name });
        setIsDeptEditing(true);
        setDeptEditingId(dept.id);
    };

    const handleDeptCancel = () => {
        setDeptFormData({ Name: "" });
        setIsDeptEditing(false);
        setDeptEditingId(null);
    };

    const handleDeptDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this department?")) {
            try {
                const response = await axios.delete(
                    `http://localhost:8080/dept/deleteDept/${ id }`
                );
                setMessage({
                    type: "success",
                    text: response.data.message || "Department deleted successfully.",
                });
                fetchDepartments();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error.response?.data?.message || "Failed to delete department.",
                });
            }
        }
    };

    const handleProgChange = (e) => {
        setProgFormData({ ...progFormData, [e.target.name]: e.target.value });
    };

    const handleProgSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            let response;
            if (isProgEditing) {
                response = await axios.put(
                    `http://localhost:8080/program/updateProgram/${ progEditingId }`,
                    progFormData
                );

            } else {
                response = await axios.post(
                    "http://localhost:8080/program/addProgram",
                    progFormData
                );
            }

            setMessage({
                type: "success",
                text:
                    response.data.message ||
                    (isProgEditing
                        ? "Program updated successfully."
                        : "Program created successfully."),
            });

            setProgFormData({ Code: "", Name: "", DepartmentId: "" });
            setIsProgEditing(false);
            setProgEditingId(null);
            fetchPrograms();
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to process program.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleProgEdit = (prog) => {
        setProgFormData({
            Code: prog.Code,
            Name: prog.Name,
            DepartmentId: prog.DepartmentId,
        });
        setIsProgEditing(true);
        setProgEditingId(prog.id);
    };

    const handleProgCancel = () => {
        setProgFormData({ Code: "", Name: "", DepartmentId: "" });
        setIsProgEditing(false);
        setProgEditingId(null);
    };

    const handleProgDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this program?")) {
            try {
                const response = await axios.delete(
                    `http://localhost:8080/program/deleteProgram/${ id }`
                );
                // Adjust if your endpoint is /prog/deleteProg/:id
                setMessage({
                    type: "success",
                    text: response.data.message || "Program deleted successfully.",
                });
                fetchPrograms();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error.response?.data?.message || "Failed to delete program.",
                });
            }
        }
    };

    return (
        <div
            className="bg-cover bg-no-repeat min-h-screen flex justify-center items-center"
            style={{ backgroundImage: `url(${ Background })` }}
        >
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Top Menu */}
            <TopMenu toggleSidebar={toggleSidebar} />

            {/* Content Container */}
            <div className="w-full max-w-7xl mx-4 my-20">
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="bg-customBlue1 from-blue-500 to-purple-600 p-6">
                        <h1 className="text-3xl font-bold text-white text-center">
                            Department & Program Management
                        </h1>
                    </div>

                    <div className="p-6">
                        {/* Global Message */}
                        {message && (
                            <div
                                className={`mb-4 p-3 text-center rounded-lg text-white font-medium ${ message.type === "success" ? "bg-green-500" : "bg-red-500"
                                    }`}
                            >
                                {message.text}
                            </div>
                        )}

                        {/* DEPARTMENTS SECTION */}
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">Departments</h2>
                        <div className="flex flex-col lg:flex-row gap-6 mb-10">
                            {/* Department Form */}
                            <div className="w-full lg:w-1/3 bg-gray-50 p-6 rounded-lg shadow">
                                <h3 className="text-xl font-bold mb-4 border-b pb-2">
                                    {isDeptEditing ? "Edit Department" : "Create Department"}
                                </h3>
                                <form onSubmit={handleDeptSubmit}>
                                    <div className="mb-4">
                                        <label
                                            htmlFor="deptName"
                                            className="block font-medium text-gray-700 mb-2"
                                        >
                                            Department Name
                                        </label>
                                        <input
                                            id="deptName"
                                            name="Name"
                                            type="text"
                                            placeholder="Enter department name"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={deptFormData.Name}
                                            onChange={handleDeptChange}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end mt-6 space-x-3">
                                        {isDeptEditing && (
                                            <button
                                                type="button"
                                                onClick={handleDeptCancel}
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 transition"
                                        >
                                            {loading
                                                ? "Processing..."
                                                : isDeptEditing
                                                    ? "Update Department"
                                                    : "Create Department"}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Department List */}
                            <div className="w-full lg:w-2/3">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-xl font-bold mb-4 border-b pb-2">
                                        Departments List
                                    </h3>
                                    {departments.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500">
                                                No departments found. Create one to get started.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            ID
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Department Name
                                                        </th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {departments.map((dept) => (
                                                        <tr
                                                            key={dept.id}
                                                            className="border-b hover:bg-gray-50 transition"
                                                        >
                                                            <td className="px-4 py-2 text-sm text-gray-600">
                                                                {dept.id}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                                {dept.Name}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-center">
                                                                <button
                                                                    className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded mr-2 hover:bg-blue-200"
                                                                    onClick={() => handleDeptEdit(dept)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                                    onClick={() => handleDeptDelete(dept.id)}
                                                                >
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

                        {/* PROGRAMS SECTION */}
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">Programs</h2>
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Program Form */}
                            <div className="w-full lg:w-1/3 bg-gray-50 p-6 rounded-lg shadow">
                                <h3 className="text-xl font-bold mb-4 border-b pb-2">
                                    {isProgEditing ? "Edit Program" : "Create Program"}
                                </h3>
                                <form onSubmit={handleProgSubmit}>
                                    {/* Program Code */}
                                    <div className="mb-4">
                                        <label
                                            htmlFor="progCode"
                                            className="block font-medium text-gray-700 mb-2"
                                        >
                                            Program Code
                                        </label>
                                        <input
                                            id="progCode"
                                            name="Code"
                                            type="text"
                                            placeholder="Enter program code"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={progFormData.Code}
                                            onChange={handleProgChange}
                                            required
                                        />
                                    </div>
                                    {/* Program Name */}
                                    <div className="mb-4">
                                        <label
                                            htmlFor="progName"
                                            className="block font-medium text-gray-700 mb-2"
                                        >
                                            Program Name
                                        </label>
                                        <input
                                            id="progName"
                                            name="Name"
                                            type="text"
                                            placeholder="Enter program name"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={progFormData.Name}
                                            onChange={handleProgChange}
                                            required
                                        />
                                    </div>
                                    {/* Department Selector */}
                                    <div className="mb-4">
                                        <label
                                            htmlFor="departmentId"
                                            className="block font-medium text-gray-700 mb-2"
                                        >
                                            Department
                                        </label>
                                        <select
                                            id="departmentId"
                                            name="DepartmentId"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={progFormData.DepartmentId}
                                            onChange={handleProgChange}
                                            required
                                        >
                                            <option value="">-- Select Department --</option>
                                            {departments.map((dept) => (
                                                <option key={dept.id} value={dept.id}>
                                                    {dept.Name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end mt-6 space-x-3">
                                        {isProgEditing && (
                                            <button
                                                type="button"
                                                onClick={handleProgCancel}
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2 bg-purple-600 text-white font-medium rounded shadow hover:bg-purple-700 transition"
                                        >
                                            {loading
                                                ? "Processing..."
                                                : isProgEditing
                                                    ? "Update Program"
                                                    : "Create Program"}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* dito simula ng Program List sa pag render */}
                            <div className="w-full lg:w-2/3">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-xl font-bold mb-4 border-b pb-2">
                                        Programs List
                                    </h3>
                                    {/**
                                     * if wala pa nahanap na program di mag rerender to 
                                     */}
                                    {programs.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500">
                                                No programs found. Create one to get started.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            ID
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Code
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Program Name
                                                        </th>
                                                        {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Department
                                                        </th> */}
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {programs.map((prog) => (
                                                        <tr
                                                            key={prog.id}
                                                            className="border-b hover:bg-gray-50 transition"
                                                        >
                                                            <td className="px-4 py-2 text-sm text-gray-600">
                                                                {prog.id}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-gray-600">
                                                                {prog.Code}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                                {prog.Name}
                                                            </td>
                                                            {/* <td className="px-4 py-2 text-sm text-gray-600">
                                                                {prog.dept?.Name || "N/A"}
                                                            </td> */}
                                                            <td className="px-4 py-2 text-sm text-center">
                                                                <button
                                                                    className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded mr-2 hover:bg-blue-200"
                                                                    onClick={() => handleProgEdit(prog)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                                    onClick={() => handleProgDelete(prog.id)}
                                                                >
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
        </div>
    );
};

export default DeptProg;
