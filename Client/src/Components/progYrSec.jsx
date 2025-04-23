import { useState, useEffect } from "react";
import axios from "../axiosConfig.js";
import { useNavigate } from "react-router-dom";
import Background from "./Img/1.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import { useAuth } from '../Components/authContext.jsx';

const ProgYrSec = () => {
    const { user } = useAuth();
    const deptId = user?.DepartmentId;
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [programs, setPrograms] = useState([]);
    const [sections, setSections] = useState([]);
    const [sectionFormData, setSectionFormData] = useState({
        Year: "",
        Section: "",
        ProgramId: "",
        NumberOfStudents: 0
    });
    const [isSectionEditing, setIsSectionEditing] = useState(false);
    const [sectionEditingId, setSectionEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState("sections");
    const navigate = useNavigate();

    // New state for delete confirmation
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        sectionId: null,
        sectionName: ""
    });

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        fetchPrograms();
        fetchSections();
    }, []);

    const fetchPrograms = async () => {
        try {
            const response = await axios.get(`/program/getAllProgByDept/${deptId}`);
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
            const response = await axios.get(`/progYrSec/getProgYrSecByDept/${deptId}`);
            if (response.data.successful) {
                const sectionsData = response.data.data || [];
                const mappedSections = sectionsData.map(section => ({
                    ...section,
                    id: section.id || section.ID || section._id || section.ProgYrSecId
                }));
                setSections(mappedSections);
                console.log("Fetched sections:", mappedSections);
            } else {
                setSections([]);
            }
        } catch (error) {
            setSections([]);
        }
    };

    const handleSectionChange = (e) => {
        const { name, value } = e.target;
        if (name === "Year" || name === "NumberOfStudents") {
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
                    `/progYrSec/updateProgYrSec/${sectionEditingId}`,
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
            ProgramId: "",
            NumberOfStudents: 0
        });
        setIsSectionEditing(false);
        setSectionEditingId(null);
    };

    const handleSectionEdit = (section) => {
        setSectionFormData({
            Year: section.Year,
            Section: section.Section,
            ProgramId: section.ProgramId,
            NumberOfStudents: section.NumberOfStudents || 0,
        });
        setIsSectionEditing(true);
        setSectionEditingId(section.id);
        if (window.innerWidth < 768) {
            setActiveTab("sections-form");
        }
    };

    const handleSectionCancel = () => {
        resetSectionForm();
    };

    // Modified to open confirmation dialog instead of using window.confirm
    const openDeleteConfirmation = (section) => {
        const programName = getProgramName(section.ProgramId);
        const sectionName = `${programName} - Year ${section.Year} Section ${section.Section}`;

        setDeleteConfirmation({
            isOpen: true,
            sectionId: section.id,
            sectionName: sectionName
        });
    };

    // Close the confirmation dialog
    const closeDeleteConfirmation = () => {
        setDeleteConfirmation({
            isOpen: false,
            sectionId: null,
            sectionName: ""
        });
    };

    // Actually perform the deletion when confirmed
    const confirmSectionDelete = async () => {
        try {
            const response = await axios.delete(`/progYrSec/deleteProgYrSec/${deleteConfirmation.sectionId}`);
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
        } finally {
            closeDeleteConfirmation();
        }
    };

    // Helper function to get program name by ID
    const getProgramName = (programId) => {
        const program = programs.find(p => p.id === programId);
        return program ? program.Name : "Unknown Program";
    };

    return (
        <div className="bg-cover bg-no-repeat min-h-screen flex justify-center items-center p-20" style={{ backgroundImage: `url(${Background})` }}>
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <TopMenu toggleSidebar={toggleSidebar} />

            <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto my-8 md:my-20">
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                    <div className="bg-blue-600 p-4 sm:p-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">Program Year Section Management</h1>
                    </div>

                    <div className="p-4 sm:p-6">
                        {message && (
                            <div className={`mb-4 p-3 text-center rounded-lg text-white font-medium ${message.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Mobile Tab Navigation */}
                        <div className="flex md:hidden mb-4 border-b">
                            <button
                                className={`w-1/2 py-2 text-center ${activeTab === 'sections-form' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}
                                onClick={() => setActiveTab("sections-form")}
                            >
                                {isSectionEditing ? "Edit Section" : "Create Section"}
                            </button>
                            <button
                                className={`w-1/2 py-2 text-center ${activeTab === 'sections' ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-500'}`}
                                onClick={() => setActiveTab("sections")}
                            >
                                Sections List
                            </button>
                        </div>

                        {/* Main Content */}
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                            {/* Section Form */}
                            <div className={`w-full md:w-1/3 bg-gray-50 p-4 sm:p-6 rounded-lg shadow ${activeTab !== 'sections-form' && 'hidden md:block'}`}>
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
                                            <option value="" key="default-program">-- Select Program --</option>
                                            {programs.map((program) => (
                                                <option key={`program-${program.id}`} value={program.id}>
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
                                    <div className="mb-4">
                                        <label htmlFor="numberOfStudents" className="block font-medium text-gray-700 mb-2">Number of Students</label>
                                        <input
                                            id="numberOfStudents"
                                            name="NumberOfStudents"
                                            type="number"
                                            min="0"
                                            placeholder="Enter number of students"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            value={sectionFormData.NumberOfStudents}
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
                            <div className={`w-full md:w-2/3 ${activeTab !== 'sections' && 'hidden md:block'}`}>
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
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                                                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                                                        <th className="px-2 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sections.map((section, index) => (
                                                        <tr key={section.id || `section-${index}`} className="border-b hover:bg-gray-50 transition">
                                                            <td className="px-2 sm:px-4 py-2 text-sm font-medium text-gray-900">
                                                                {getProgramName(section.ProgramId)}
                                                            </td>
                                                            <td className="px-2 sm:px-4 py-2 text-sm text-gray-600">{section.Year}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-sm text-gray-600">{section.Section}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-sm text-gray-600">{section.NumberOfStudents || 0}</td>
                                                            <td className="px-2 sm:px-4 py-2 text-sm text-center">
                                                                <button
                                                                    className="inline-block px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded mr-1 sm:mr-2 hover:bg-blue-200"
                                                                    onClick={() => handleSectionEdit(section)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="inline-block px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                                    onClick={() => openDeleteConfirmation(section)}
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

            {/* Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
                        <p className="mb-6 text-gray-700">
                            Are you sure you want to delete <span className="font-semibold">{deleteConfirmation.sectionName}</span>?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={closeDeleteConfirmation}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmSectionDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgYrSec;