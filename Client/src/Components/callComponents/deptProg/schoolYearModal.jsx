import { useState, useEffect } from "react";
import axios from "../../../axiosConfig";

const SchoolYearModal = ({ isOpen, onClose }) => {
    const [schoolYears, setSchoolYears] = useState([]);
    const [formData, setFormData] = useState({ SY_Name: "" });
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [activeTab, setActiveTab] = useState("list");
    const [currentSchoolYear, setCurrentSchoolYear] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchSchoolYears();
            fetchCurrentSchoolYear();
        }
    }, [isOpen]);

    const isValidSchoolYear = (name) => {
        const regex = /^(\d{4})-(\d{4})$/;
        const match = name.match(regex);
        if (!match) return false;
        const firstYear = parseInt(match[1]);
        const secondYear = parseInt(match[2]);
        return secondYear === firstYear + 1;
    };

    const fetchSchoolYears = async () => {
        try {
            const response = await axios.get("/schoolyear/getAllSchoolYears");
            if (response.data.successful) {
                setSchoolYears(response.data.data || []);
            } else {
                setSchoolYears([]);
            }
        } catch (error) {
            setSchoolYears([]);
        }
    };

    const fetchCurrentSchoolYear = async () => {
        try {
            const response = await axios.get("/schoolyear/getCurrentSchoolYear");
            if (response.data.successful) {
                setCurrentSchoolYear(response.data.data || null);
            } else {
                setCurrentSchoolYear(null);
            }
        } catch (error) {
            setCurrentSchoolYear(null);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isValidSchoolYear(formData.SY_Name)) {
            setMessage({
                type: "error",
                text: "School Year must be in format YYYY-YYYY where the second year is one more than the first (e.g., 2024-2025).",
            });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            let response;
            if (isEditing) {
                response = await axios.put(`/schoolyear/updateSchoolYear/${editingId}`, formData);
            } else {
                response = await axios.post("/schoolyear/addSchoolYear", formData);
            }

            setMessage({
                type: "success",
                text: response.data.message || (isEditing ? "School Year updated successfully." : "School Year created successfully."),
            });
            setTimeout(() => setMessage(null), 1000);

            setFormData({ SY_Name: "" });
            setIsEditing(false);
            setEditingId(null);
            fetchSchoolYears();
            fetchCurrentSchoolYear();
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to process School Year.",
            });
            setTimeout(() => setMessage(null), 1000);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (schoolYear) => {
        setFormData({ SY_Name: schoolYear.SY_Name });
        setIsEditing(true);
        setEditingId(schoolYear.id);
        setActiveTab("form");
    };

    const handleCancel = () => {
        setFormData({ SY_Name: "" });
        setIsEditing(false);
        setEditingId(null);
    };

    const handleDelete = (id) => {
        setDeletingId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;

        try {
            const response = await axios.delete(`/schoolyear/deleteSchoolYear/${deletingId}`);
            setMessage({
                type: "success",
                text: response.data.message || "School Year deleted successfully.",
            });
            setTimeout(() => setMessage(null), 1000);
            fetchSchoolYears();
            fetchCurrentSchoolYear();
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to delete School Year.",
            });
            setTimeout(() => setMessage(null), 1000);
        } finally {
            setShowDeleteModal(false);
            setDeletingId(null);
        }
    };

    const generateNextYear = () => {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        setFormData({ SY_Name: `${currentYear}-${nextYear}` });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header - Changed to blue to match DeptProg */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">School Year Management</h2>
                        <button onClick={onClose} className="text-white hover:text-blue-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    {message && (
                        <div className={`mb-4 p-3 text-center rounded-lg text-white font-medium ${message.type === "success" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Current School Year - Changed to blue to match DeptProg */}
                    {currentSchoolYear && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="text-lg font-semibold text-blue-800 mb-2">Current School Year</h3>
                            <div className="text-xl font-bold text-blue-900">{currentSchoolYear.SY_Name}</div>
                        </div>
                    )}

                    {/* Tab Navigation - Changed to blue to match DeptProg */}
                    <div className="flex mb-4 border-b">
                        <button
                            className={`w-1/2 py-2 text-center ${activeTab === 'form' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}
                            onClick={() => setActiveTab("form")}
                        >
                            {isEditing ? "Edit School Year" : "Create School Year"}
                        </button>
                        <button
                            className={`w-1/2 py-2 text-center ${activeTab === 'list' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}
                            onClick={() => setActiveTab("list")}
                        >
                            School Years List
                        </button>
                    </div>

                    {/* Form - Changed to blue to match DeptProg */}
                    {activeTab === 'form' && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl shadow-md">
                            <h3 className="text-lg font-bold mb-4 border-b border-blue-100 pb-2 text-indigo-800">
                                {isEditing ? "Edit School Year" : "Create School Year"}
                            </h3>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label htmlFor="SY_Name" className="block font-medium text-gray-700 mb-2">School Year (YYYY-YYYY)</label>
                                    <input
                                        id="SY_Name"
                                        name="SY_Name"
                                        type="text"
                                        placeholder="e.g., 2024-2025"
                                        className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.SY_Name}
                                        onChange={handleChange}
                                        pattern="[0-9]{4}-[0-9]{4}"
                                        required
                                    />
                                    <p className="mt-2 text-sm text-gray-500">Format: YYYY-YYYY (e.g., 2024-2025)</p>
                                </div>

                                {!isEditing && (
                                    <div className="mb-4">
                                        <button
                                            type="button"
                                            onClick={generateNextYear}
                                            className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                        >
                                            Generate Current-Next School Year
                                        </button>
                                    </div>
                                )}

                                <div className="flex justify-end mt-6 space-x-3">
                                    {isEditing && (
                                        <button type="button" onClick={handleCancel}
                                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg">
                                            Cancel
                                        </button>
                                    )}
                                    <button type="submit" disabled={loading}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                                        {loading ? "Processing..." : isEditing ? "Update" : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* List - Changed to blue to match DeptProg */}
                    {activeTab === 'list' && (
                        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                            <h3 className="text-lg font-bold mb-4 border-b pb-2 text-indigo-800">School Years List</h3>
                            {schoolYears.length === 0 ? (
                                <div className="text-center py-12 bg-blue-50 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    </svg>
                                    <p className="text-gray-500">No school years found. Create one to get started.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">School Year</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {schoolYears.map((schoolYear) => (
                                                <tr key={schoolYear.id} className="hover:bg-blue-50 transition-all duration-200">
                                                    <td className="px-4 py-3 text-sm text-gray-600">{schoolYear.id}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{schoolYear.SY_Name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentSchoolYear && currentSchoolYear.id === schoolYear.id
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {currentSchoolYear && currentSchoolYear.id === schoolYear.id ? 'Current' : 'Past'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-center">
                                                        <button className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-lg mr-4 hover:bg-blue-200 transition-all duration-200"
                                                            onClick={() => handleEdit(schoolYear)}>Edit</button>
                                                        <button className="inline-block px-4 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200"
                                                            onClick={() => handleDelete(schoolYear.id)}>Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Delete</h3>
                        <p className="mb-6 text-gray-700">
                            Are you sure you want to delete this school year? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md"
                                onClick={confirmDelete}
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

export default SchoolYearModal;