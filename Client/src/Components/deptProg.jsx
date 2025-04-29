import { useState, useEffect } from "react";
import axios from "../axiosConfig.js";
import { useNavigate } from "react-router-dom";
import Background from "./Img/1.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import { useAuth } from '../Components/authContext.jsx';

const DeptProg = () => {
    const { user } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [deptFormData, setDeptFormData] = useState({ Name: "", isCore: false });
    const [isDeptEditing, setIsDeptEditing] = useState(false);
    const [deptEditingId, setDeptEditingId] = useState(null);
    const [programs, setPrograms] = useState([]);
    const [progFormData, setProgFormData] = useState({ Code: "", Name: "", DepartmentId: "" });
    const [isProgEditing, setIsProgEditing] = useState(false);
    const [progEditingId, setProgEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingDeptId, setDeletingDeptId] = useState(null);
    const [deletingProgId, setDeletingProgId] = useState(null);
    const [deleteType, setDeleteType] = useState(null);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState("departments"); // For mobile tab switching
    const navigate = useNavigate();
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        fetchDepartments();
        fetchPrograms();
    }, []);

        // Validation functions
    const isValidName = (name) => {
        // Only allow letters, spaces and hyphens in names
        const nameRegex = /^[A-Za-z\s-]+$/;
        return nameRegex.test(name);
    };

    const isValidCode = (code) => {
        // Allow only alphanumeric characters for codes (no periods or special characters)
        const codeRegex = /^[A-Za-z0-9]+$/;
        return codeRegex.test(code);
      };
  

    const fetchDepartments = async () => {
        try {
            const response = await axios.get("/dept/getAllDept");
            if (response.data.successful) {
                setDepartments(response.data.data || []);
            } else {
                setDepartments([]);
            }
        } catch (error) {
            setDepartments([]);
        }
    };

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

    const handleDeptChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        // Apply validation for the department name field
        if (name === 'Name' && value !== '' && !isValidName(value)) {
          setMessage({
            type: "error",
            text: "Department name should only contain letters, spaces, and hyphens.",
          });
          setTimeout(() => {
            setMessage(null);
          }, 2000);
          return;
        }
        
        setDeptFormData({ ...deptFormData, [name]: newValue });
      };
      

      const handleDeptSubmit = async (e) => {
        e.preventDefault();
        
        // Final validation check before submission
        if (!isValidName(deptFormData.Name)) {
          setMessage({
            type: "error",
            text: "Department name should only contain letters, spaces, and hyphens.",
          });
          setTimeout(() => {
            setMessage(null);
          }, 2000);
          return;
        }
        
        setLoading(true);
        setMessage(null);
        try {
          let response;
          if (isDeptEditing) {
            response = await axios.put(
              `/dept/updateDept/${deptEditingId}`,
              deptFormData
            );
          } else {
            response = await axios.post(
              "/dept/addDept",
              deptFormData
            );
            setSuccess(true);
            setTimeout(() => {
              setSuccess(false);
            }, 2000);
          }
      
          setMessage({
            type: "success",
            text: response.data.message || (isDeptEditing ? "Department updated successfully." : "Department created successfully."),
          });
          setTimeout(() => {
            setMessage(null);
          }, 1000);
      
          setDeptFormData({ Name: "", isCore: false });
          setIsDeptEditing(false);
          setDeptEditingId(null);
          fetchDepartments();
        } catch (error) {
          setMessage({
            type: "error",
            text: error.response?.data?.message || "Failed to process department.",
          });
          setTimeout(() => {
            setMessage(null);
          }, 1000);
        } finally {
          setLoading(false);
        }
      };

    const handleDeptEdit = (dept) => {
        setDeptFormData({ 
            Name: dept.Name,
            isCore: dept.isCore || false
        });
        setIsDeptEditing(true);
        setDeptEditingId(dept.id);
        // On mobile, switch to form view when editing
        if (window.innerWidth < 768) {
            setActiveTab("departments-form");
        }
    };

    const handleDeptCancel = () => {
        setDeptFormData({ Name: "", isCore: false });
        setIsDeptEditing(false);
        setDeptEditingId(null);
    };

    const handleDeptDelete = (id) => {
        setDeletingDeptId(id);
        setDeleteType('department');
        setShowDeleteModal(true);
    };

    const handleProgDelete = (id) => {
        setDeletingProgId(id);
        setDeleteType('program');
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (
            (deleteType === 'program' && !deletingProgId) ||
            (deleteType === 'department' && !deletingDeptId)
        ) {
            setMessage({
                type: 'error',
                text: `Invalid ID for ${deleteType} deletion.`,
            });
            return;
        }

        try {
            if (deleteType === 'program') {
                const response = await axios.delete(`/program/deleteProgram/${deletingProgId}`);
                setMessage({
                    type: "success",
                    text: response.data.message || "Program deleted successfully.",
                });
                setTimeout(() => {
                    setMessage(null);
                }, 1000);
                fetchPrograms();
            } else if (deleteType === 'department') {
                const response = await axios.delete(`/dept/deleteDept/${deletingDeptId}`);
                setMessage({
                    type: "success",
                    text: response.data.message || "Department deleted successfully.",
                });
                setTimeout(() => {
                    setMessage(null);
                }, 1000);
                fetchDepartments();
            }
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || `Failed to delete ${deleteType}.`,
            });
            setTimeout(() => {
                setMessage(null);
            }, 1000);
        } finally {
            setShowDeleteModal(false);
            setDeletingProgId(null);
            setDeletingDeptId(null);
            setDeleteType(null);
        }
    };

    const handleProgChange = (e) => {
        const { name, value } = e.target;
        
        // Apply validation for program name
        if (name === 'Name' && value !== '' && !isValidName(value)) {
          setMessage({
            type: "error",
            text: "Program name should only contain letters, spaces, and hyphens.",
          });
          setTimeout(() => {
            setMessage(null);
          }, 2000);
          return;
        }
        
        // Apply validation for program code
        if (name === 'Code' && value !== '' && !isValidCode(value)) {
          setMessage({
            type: "error",
            text: "Program code should only contain letters and numbers.",
          });
          setTimeout(() => {
            setMessage(null);
          }, 2000);
          return;
        }
        
        setProgFormData({ ...progFormData, [name]: value });
      };

      const handleProgSubmit = async (e) => {
        e.preventDefault();
        
        // Final validation check before submission
        if (!isValidName(progFormData.Name)) {
          setMessage({
            type: "error",
            text: "Program name should only contain letters, spaces, and hyphens.",
          });
          setTimeout(() => {
            setMessage(null);
          }, 2000);
          return;
        }
        
        if (!isValidCode(progFormData.Code)) {
          setMessage({
            type: "error",
            text: "Program code should only contain letters and numbers.",
          });
          setTimeout(() => {
            setMessage(null);
          }, 2000);
          return;
        }
        
        setLoading(true);
        setMessage(null);
        try {
          let response;
          if (isProgEditing) {
            response = await axios.put(
              `/program/updateProgram/${progEditingId}`,
              progFormData
            );
          } else {
            response = await axios.post(
              "/program/addProgram",
              progFormData
            );
            setSuccess(true);
            setTimeout(() => {
              setSuccess(false);
            }, 2000);
          }
      
          setMessage({
            type: "success",
            text: response.data.message || (isProgEditing ? "Program updated successfully." : "Program created successfully."),
          });
          setTimeout(() => {
            setMessage(null);
          }, 1000);
      
          setProgFormData({ Code: "", Name: "", DepartmentId: "" });
          setIsProgEditing(false);
          setProgEditingId(null);
          fetchPrograms();
        } catch (error) {
          setMessage({
            type: "error",
            text: error.response?.data?.message || "Failed to process program.",
          });
          setTimeout(() => {
            setMessage(null);
          }, 1000);
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
        // On mobile, switch to form view when editing
        if (window.innerWidth < 768) {
            setActiveTab("programs-form");
        }
    };

    const handleProgCancel = () => {
        setProgFormData({ Code: "", Name: "", DepartmentId: "" });
        setIsProgEditing(false);
        setProgEditingId(null);
    };

    return (
        <div className="bg-cover bg-no-repeat min-h-screen flex justify-center items-center" style={{ backgroundImage: `url(${Background})` }}>
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <TopMenu toggleSidebar={toggleSidebar} />

            <div className="w-full px-4 sm:px-6 lg:max-w-6xl lg:mx-auto my-8 md:my-20">
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r bg-blue-600 p-4 sm:p-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center p-6">Department & Program Management</h1>
                    </div>
                    <div className="p-4 sm:p-6">
                        {message && (
                            <div className={`mb-4 p-3 text-center rounded-lg text-white font-medium ${message.type === "success" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}>
                                {message.text}
                            </div>
                        )}
                        {/* Mobile Tab Navigation */}
                        <div className="flex md:hidden mb-4 border-b">
                            <button
                                className={`w-1/2 py-2 text-center ${activeTab.startsWith('departments') ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}
                                onClick={() => setActiveTab("departments")}
                            >
                                Departments
                            </button>
                            <button
                                className={`w-1/2 py-2 text-center ${activeTab.startsWith('programs') ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-500'}`}
                                onClick={() => setActiveTab("programs")}
                            >
                                Programs
                            </button>
                        </div>
                        {/* Departments Section */}
                        <div className={`${!activeTab.startsWith('departments') && 'hidden md:block'}`}>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center">
                                <span className="bg-blue-100 text-blue-700 p-1 rounded-lg mr-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-18 w-18 m-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </span>
                                Departments
                            </h2>
                            {/* Mobile View - Department Forms vs List Tab */}
                            <div className="flex md:hidden mb-4">
                                <button
                                    className={`w-1/2 py-2 text-sm text-center ${activeTab === 'departments-form' ? 'bg-blue-100 text-blue-700 font-medium rounded-t-lg' : 'bg-gray-100 text-gray-600'}`}
                                    onClick={() => setActiveTab("departments-form")}
                                >
                                    {isDeptEditing ? "Edit Department" : "Create Department"}
                                </button>
                                <button
                                    className={`w-1/2 py-2 text-sm text-center ${activeTab === 'departments' ? 'bg-blue-100 text-blue-700 font-medium rounded-t-lg' : 'bg-gray-100 text-gray-600'}`}
                                    onClick={() => setActiveTab("departments")}
                                >
                                    Departments List
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-8">
                                <div className={`w-full md:w-1/3 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl shadow-md ${activeTab !== 'departments-form' && activeTab !== 'departments' && 'hidden md:block'} ${activeTab === 'departments' && 'md:block hidden'}`}>
                                    <h3 className="text-lg sm:text-xl font-bold mb-4 border-b border-blue-100 pb-2 text-indigo-800">
                                        {isDeptEditing ? "Edit Department" : "Create Department"}
                                    </h3>
                                    <form onSubmit={handleDeptSubmit}>
                                        <div className="mb-4">
                                            <label htmlFor="deptName" className="block font-medium text-gray-700 mb-2">Department Name</label>
                                            <input id="deptName" name="Name" type="text" placeholder="Enter department name"
                                                className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                value={deptFormData.Name} onChange={handleDeptChange} required />
                                        </div>
                                        <div className="mb-4">
                                            <div className="flex items-center">
                                                <input 
                                                    id="isCore" 
                                                    name="isCore" 
                                                    type="checkbox" 
                                                    className="h-12 w-12 text-blue-600 mt-1 mr-2 border-gray-300 rounded focus:ring-blue-500"
                                                    checked={deptFormData.isCore}
                                                    onChange={handleDeptChange}
                                                />
                                                <label htmlFor="isCore" className="ml-2 block font-medium text-gray-700">
                                                    Core Department
                                                </label>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">Check if this is a core department</p>
                                        </div>
                                        <div className="flex justify-end mt-6 space-x-3">
                                            {isDeptEditing && (
                                                <button type="button" onClick={handleDeptCancel}
                                                    className="px-4 sm:px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-all duration-300 font-medium">
                                                    Cancel
                                                </button>
                                            )}
                                            <button type="submit" disabled={loading}
                                                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                                                {loading ? "Processing..." : isDeptEditing ? "Update" : "Create"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                                <div className={`w-full md:w-2/3 ${activeTab !== 'departments' && activeTab !== 'departments-form' && 'hidden md:block'} ${activeTab === 'departments-form' && 'md:block hidden'}`}>
                                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
                                        <h3 className="text-lg sm:text-xl font-bold mb-4 border-b pb-2 text-indigo-800">Departments List</h3>
                                        {departments.length === 0 ? (
                                            <div className="text-center py-12 bg-blue-50 rounded-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                </svg>
                                                <p className="text-gray-500">No departments found. Create one to get started.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider rounded-l-lg">ID</th>
                                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Department Name</th>
                                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Core</th>
                                                            <th className="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider rounded-r-lg">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {departments.map((dept) => (
                                                            <tr key={dept.id} className="hover:bg-blue-50 transition-all duration-200">
                                                                <td className="px-3 sm:px-4 py-3 text-sm text-gray-600">{dept.id}</td>
                                                                <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">{dept.Name}</td>
                                                                <td className="px-3 sm:px-4 py-3 text-sm text-gray-600">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${dept.isCore ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                        {dept.isCore ? 'Yes' : 'No'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 sm:px-4 py-3 text-sm text-center">
                                                                    <button className="inline-block px-3 sm:px-4 py-1.5 bg-blue-100 text-blue-700 rounded-lg mr-4 hover:bg-blue-200 transition-all duration-200"
                                                                        onClick={() => handleDeptEdit(dept)}>Edit</button>
                                                                    <button className="inline-block px-3 sm:px-4 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200"
                                                                        onClick={() => handleDeptDelete(dept.id)}>Delete</button>
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

                        {/* Programs Section */}
                        <div className={`${!activeTab.startsWith('programs') && 'hidden md:block'}`}>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center">
                                <span className="bg-purple-100 text-purple-700 p-1 rounded-lg mr-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-18 w-18 m-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                </span>
                                Programs
                            </h2>
                            {/* Mobile View - Program Forms vs List Tab */}
                            <div className="flex md:hidden mb-4">
                                <button
                                    className={`w-1/2 py-2 text-sm text-center ${activeTab === 'programs-form' ? 'bg-purple-100 text-purple-700 font-medium rounded-t-lg' : 'bg-gray-100 text-gray-600'}`}
                                    onClick={() => setActiveTab("programs-form")}
                                >
                                    {isProgEditing ? "Edit Program" : "Create Program"}
                                </button>
                                <button
                                    className={`w-1/2 py-2 text-sm text-center ${activeTab === 'programs' ? 'bg-purple-100 text-purple-700 font-medium rounded-t-lg' : 'bg-gray-100 text-gray-600'}`}
                                    onClick={() => setActiveTab("programs")}
                                >
                                    Programs List
                                </button>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                                <div className={`w-full md:w-1/3 bg-gradient-to-br from-purple-50 to-indigo-50 p-4 sm:p-6 rounded-xl shadow-md ${activeTab !== 'programs-form' && activeTab !== 'programs' && 'hidden md:block'} ${activeTab === 'programs' && 'md:block hidden'}`}>
                                    <h3 className="text-lg sm:text-xl font-bold mb-4 border-b border-purple-100 pb-2 text-purple-800">
                                        {isProgEditing ? "Edit Program" : "Create Program"}
                                    </h3>
                                    <form onSubmit={handleProgSubmit}>
                                        <div className="mb-4">
                                            <label htmlFor="progCode" className="block font-medium text-gray-700 mb-2">Program Code</label>
                                            <input id="progCode" name="Code" type="text" placeholder="Enter program code"
                                                className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                                value={progFormData.Code} onChange={handleProgChange} required />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="progName" className="block font-medium text-gray-700 mb-2">Program Name</label>
                                            <input id="progName" name="Name" type="text" placeholder="Enter program name"
                                                className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                                value={progFormData.Name} onChange={handleProgChange} required />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="departmentId" className="block font-medium text-gray-700 mb-2">Department</label>
                                            <select id="departmentId" name="DepartmentId"
                                                className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                                value={progFormData.DepartmentId} onChange={handleProgChange} required>
                                                <option value="">-- Select Department --</option>
                                                {departments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>{dept.Name} {dept.isCore ? '(Core)' : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex justify-end mt-6 space-x-3">
                                            {isProgEditing && (
                                                <button type="button" onClick={handleProgCancel}
                                                    className="px-4 sm:px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-all duration-300 font-medium">
                                                    Cancel
                                                </button>
                                            )}
                                            <button type="submit" disabled={loading}
                                                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                                                {loading ? "Processing..." : isProgEditing ? "Update" : "Create"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                                <div className={`w-full md:w-2/3 ${activeTab !== 'programs' && activeTab !== 'programs-form' && 'hidden md:block'} ${activeTab === 'programs-form' && 'md:block hidden'}`}>
                                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
                                        <h3 className="text-lg sm:text-xl font-bold mb-4 border-b pb-2 text-purple-800">Programs List</h3>
                                        {programs.length === 0 ? (
                                            <div className="text-center py-12 bg-purple-50 rounded-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-purple-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                </svg>
                                                <p className="text-gray-500">No programs found. Create one to get started.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                    <tr className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg">
                                                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider rounded-l-lg">ID</th>
                                                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Code</th>
                                                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Program Name</th>
                                                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Department</th>
                                                        <th className="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider rounded-r-lg">Actions</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                    {programs.map((prog) => {
                                                        const dept = departments.find(d => d.id === prog.DepartmentId);
                                                        return (
                                                        <tr key={prog.id} className="hover:bg-purple-50 transition-all duration-200">
                                                            <td className="px-3 sm:px-4 py-3 text-sm text-gray-600">{prog.id}</td>
                                                            <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">{prog.Code}</td>
                                                            <td className="px-3 sm:px-4 py-3 text-sm text-gray-800">{prog.Name}</td>
                                                            <td className="px-3 sm:px-4 py-3 text-sm text-gray-600">
                                                            {dept ? dept.Name : <span className="text-red-500">Department not found</span>}
                                                            </td>
                                                            <td className="px-3 sm:px-4 py-3 text-sm text-center">
                                                            <button
                                                                className="inline-block px-3 sm:px-4 py-1.5 bg-purple-100 text-purple-700 rounded-lg mr-2 hover:bg-purple-200 transition-all duration-200"
                                                                onClick={() => handleProgEdit(prog)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="inline-block px-3 sm:px-4 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200"
                                                                onClick={() => handleProgDelete(prog.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm duration-300">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Delete</h3>
                        <p className="mb-6 text-gray-700">
                            Are you sure you want to delete this {deleteType}? This action cannot be undone.
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

            {/* Success Animation */}
            {success && (
                <div className="fixed right-5 bottom-5 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 flex items-center shadow-md rounded-md animate-fade-in">
                    <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <p>Operation completed successfully!</p>
                </div>
            )}
        </div>
    );
};

export default DeptProg;