import { useState, useEffect } from "react";
import axios from "../axiosConfig.js";
import { useNavigate } from "react-router-dom";
import Background from "./Img/1.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";

const CreateAccount = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    Name: "",
    Email: "",
    Roles: "",
    DepartmentId: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  // Toggle Sidebar Function
  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Fetch departments on component mount
  useEffect(() => {
    axios
      .get("/dept/getAllDept")
      .then((response) => {
        // Extract the departments array from the 'data' property
        const deptArray = response.data.data || [];
        if (Array.isArray(deptArray)) {
          setDepartments(deptArray);
        } else {
          console.error("Expected departments to be an array, but got:", deptArray);
          setDepartments([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching departments:", error);
      });
  }, []);


  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post(
        "/accounts/addAccount",
        formData
      );

      setMessage({ type: "success", text: response.data.message });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/accountList");
      }, 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to create account.",
      });
    } finally {
      setLoading(false);
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

      {/* Form Container */}
      <div className="relative bg-blue-700/70 p-10 rounded-lg shadow-lg w-full lg:max-w-lg">
        {/* Close Button */}
        <button
          className="absolute top-5 right-15 text-white font-bold text-3xl hover:text-red-500 duration-300"
          onClick={() => navigate("/")}
        >
          &times;
        </button>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white text-center">Create Account</h1>

        {/* Display Message */}
        {message && (
          <p
            className={`mt-4 p-3 text-center rounded ${message.type === "success" ? "bg-green-500" : "bg-red-500"
              } text-white`}
          >
            {message.text}
          </p>
        )}

        <form className="mt-6" onSubmit={handleSubmit}>
          {/* Department Selection */}
          <div className="mb-6">
            <label
              className="block font-semibold text-white mb-2"
              htmlFor="DepartmentId"
            >
              Select Department:
            </label>
            <select
              id="DepartmentId"
              name="DepartmentId"
              value={formData.DepartmentId}
              onChange={handleChange}
              className="border rounded w-full py-9 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="" disabled>
                -- Select Department --
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.Name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block font-semibold text-white mb-2" htmlFor="Roles">
              Select Role:
            </label>
            <select
              id="Roles"
              name="Roles"
              value={formData.Roles}
              onChange={handleChange}
              className="border rounded w-full py-9 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="" disabled>
                -- Select Role --
              </option>
              <option value="Program Head">Program Head</option>
              <option value="Dept. Secretary">Department Secretary</option>
            </select>
          </div>

          {/* Full Name */}
          <div className="mb-6">
            <label className="block font-semibold text-white mb-2" htmlFor="Name">
              Full Name:
            </label>
            <input
              className="border rounded w-full py-10 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Name"
              name="Name"
              type="text"
              placeholder="Full Name"
              value={formData.Name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email Address */}
          <div className="mb-6">
            <label className="block font-semibold text-white mb-2" htmlFor="Email">
              Email Address:
            </label>
            <input
              className="border rounded w-full py-10 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Email"
              name="Email"
              type="email"
              placeholder="example@ceu.edu.ph"
              value={formData.Email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end mt-10 mb-2 space-x-4">
            <button
              className="bg-customLightBlue2 hover:bg-blue-300 text-gray-700 font-bold py-4 px-8 rounded duration-300"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAccount;
