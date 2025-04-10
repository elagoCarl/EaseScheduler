import { useState, useEffect } from "react";
import axios from "../axiosConfig.js";
import { useNavigate } from "react-router-dom";
import Background from "./Img/1.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";

const ProgYrSec = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [programs, setPrograms] = useState([]);
    const [sections, setSections] = useState([]);
    const [sectionFormData, setSectionFormData] = useState({
        Year: "",
        Section: "",
        ProgramId: ""
    });
    const [isSectionEditing, setIsSectionEditing] = useState(false);
    const [sectionEditingId, setSectionEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState("sections"); // For mobile tab switching
    const navigate = useNavigate();

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        fetchPrograms();
        fetchSections();
    }, []);

    const fetchPrograms = async () => {
        try {
            const response = await axios.get("/program/getAllProgram");
            if (response.data.successful) {
                setPrograms(response.data.data || []);
            } else {
                setPrograms([]);
            }
        } catch (error) {
            setPrograms([]);
        }
    };

    const fetchSections = async () => {
        try {
            const response = await axios.get("/progYrSec/getAllProgYrSec");
            if (response.data.successful) {
                setSections(response.data.data || []);
            } else {
                setSections([]);
            }
        } catch (error) {
            setSections([]);
        }
    };

    const handleSectionChange = (e) => {
        const { name, value } = e.target;
        // Convert Year to integer when appropriate
        if (name === "Year") {
            setSectionFormData({ ...sectionFormData, [name]: value === "" ? "" : parseInt(value) });
        } else {
            setSectionFormData({ ...sectionFormData, [name]: value });
        }
    };

    const handleSectionSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            let response;
            if (isSectionEditing) {
                response = await axios.put(
                    `/progYrSec/updateProgYrSec/${ sectionEditingId }`,
                    sectionFormData
                );
            } else {
                response = await axios.post(
                    "/progYrSec/addProgYrSec",
                    sectionFormData
                );
            }

            setMessage({
                type: "success",
                text: response.data.message || (isSectionEditing ? "Section updated successfully." : "Section created successfully."),
            });

            resetSectionForm();
            fetchSections();
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to process section.",
            });
        } finally {
            setLoading(false);
        }
    };

    const resetSectionForm = () => {
        setSectionFormData({
            Year: "",
            Section: "",
            ProgramId: ""
        });
        setIsSectionEditing(false);
        setSectionEditingId(null);
    };

    const handleSectionEdit = (section) => {
        setSectionFormData({
            Year: section.Year,
            Section: section.Section,
            ProgramId: section.ProgramId,
        });
        setIsSectionEditing(true);
        setSectionEditingId(section.id);
        // On mobile, switch to form view when editing
        if (window.innerWidth < 768) {
            setActiveTab("sections-form");
        }
    };

    const handleSectionCancel = () => {
        resetSectionForm();
    };

    const handleSectionDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this section?")) {
            try {
                const response = await axios.delete(`/progYrSec/deleteProgYrSec/${ id }`);
                setMessage({
                    type: "success",
                    text: response.data.message || "Section deleted successfully.",
                });
                fetchSections();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error.response?.data?.message || "Failed to delete section.",
                });
            }
        }
    };

    // Helper function to get program name by ID
    const getProgramName = (programId) => {
        const program = programs.find(p => p.id === programId);
        return program ? program.Name : "Unknown Program";
    };

    return (
        <div className="bg-cover bg-no-repeat min-h-screen flex justify-center items-center" style={{ backgroundImage: `url(${ Background })` }}>
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <TopMenu toggleSidebar={toggleSidebar} />

            <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto my-8 md:my-20">
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                    <div className="bg-blue-600 p-4 sm:p-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">Program Year Section Management</h1>
                    </div>

                    <div className="p-4 sm:p-6">
                        {message && (
                            <div className={`mb-4 p-3 text-center rounded-lg text-white font-medium ${ message.type === "success" ? "bg-green-500" : "bg-red-500" }`}>
                                {message.text}
                            </div>
                        )}

                        {/* Mobile Tab Navigation */}
                        <div className="flex md:hidden mb-4 border-b">
                            <button
                                className={`w-1/2 py-2 text-center ${ activeTab === 'sections-form' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500' }`}
                                onClick={() => setActiveTab("sections-form")}
                            >
                                {isSectionEditing ? "Edit Section" : "Create Section"}
                            </button>
                            <button
                                className={`w-1/2 py-2 text-center ${ activeTab === 'sections' ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-500' }`}
                                onClick={() => setActiveTab("sections")}
                            >
                                Sections List
                            </button>
                        </div>

                        {/* Main Content */}
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                            {/* Section Form */}
                            <div className={`w-full md:w-1/3 bg-gray-50 p-4 sm:p-6 rounded-lg shadow ${ activeTab !== 'sections-form' && 'hidden md:block' }`}>
                                <h3 className="text-lg sm:text-xl font-bold mb-4 border-b pb-2">
                                    {isSectionEditing ? "Edit Section" : "Create Section"}
                                </h3>
                                <form onSubmit={handleSectionSubmit}>
                                    <div className="mb-4">
                                        <label htmlFor="programId" className="block font-medium text-gray-700 mb-2">Program</label>
                                        <select
                                            id="programId"
                                            name="ProgramId"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={sectionFormData.ProgramId}
                                            onChange={handleSectionChange}
                                            required
                                        >
                                            <option value="">-- Select Program --</option>
                                            {programs.map((program) => (
                                                <option key={program.id} value={program.id}>
                                                    {program.Code} - {program.Name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="year" className="block font-medium text-gray-700 mb-2">Year Level</label>
                                        <input
                                            id="year"
                                            name="Year"
                                            type="number"
                                            min="1"
                                            placeholder="Enter year level"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={sectionFormData.Year}
                                            onChange={handleSectionChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="section" className="block font-medium text-gray-700 mb-2">Section</label>
                                        <input
                                            id="section"
                                            name="Section"
                                            type="text"
                                            placeholder="Enter section (e.g., A, B, C)"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={sectionFormData.Section}
                                            onChange={handleSectionChange}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end mt-6 space-x-3">
                                        {isSectionEditing && (
                                            <button
                                                type="button"
                                                onClick={handleSectionCancel}
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
                                            {loading ? "Processing..." : isSectionEditing ? "Update" : "Create"}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Section List */}
                            <div className={`w-full md:w-2/3 ${ activeTab !== 'sections' && 'hidden md:block' }`}>
                                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                                    <h3 className="text-lg sm:text-xl font-bold mb-4 border-b pb-2">Sections List</h3>
                                    {sections.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500">No sections found. Create one to get started.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                                                        <th className="px-2 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sections.map((section) => (
                                                        <tr key={section.id} className="border-b hover:bg-gray-50 transition">
                                                            <td className="px-2 sm:px-4 py-2 text-sm text-gray-600">{section.id}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-sm font-medium text-gray-900">
                                                                {getProgramName(section.ProgramId)}
                                                            </td>
                                                            <td className="px-2 sm:px-4 py-2 text-sm text-gray-600">{section.Year}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-sm text-gray-600">{section.Section}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-sm text-center">
                                                                <button
                                                                    className="inline-block px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded mr-1 sm:mr-2 hover:bg-blue-200"
                                                                    onClick={() => handleSectionEdit(section)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="inline-block px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                                    onClick={() => handleSectionDelete(section.id)}
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

export default ProgYrSec;