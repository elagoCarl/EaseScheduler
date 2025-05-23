import { useState, useEffect, useMemo } from 'react';
import ScheduleReportModal from '../Components/callComponents/scheduleReport.jsx';
import ScheduleVariantModal from '../Components/callComponents/variantSelectHandler.jsx';
import ProfAvailabilityModal from '../Components/callComponents/miniProfAvailabilityModal.jsx';
import axios from '../axiosConfig.js';
import delBtn from './Img/delBtn.png';
import editBtn from './Img/editBtn.png';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';
import DeleteWarning from './callComponents/deleteWarning.jsx';
import EditSchedRecordModal from './callComponents/editSchedRecordModal.jsx';
import { useAuth } from '../Components/authContext.jsx';
import lock from './Img/lock.svg';
import unlock from './Img/unlock.svg';
import { useNavigate } from 'react-router-dom';
import { Home, Users, BookOpen, Settings } from 'lucide-react'
import SettingsModal from './settings.jsx'
import DeleteConfirmationModal from './callComponents/deleteConfirmationModal.jsx';

const AddConfigSchedule = () => {
  const { user } = useAuth();
  const deptId = user?.DepartmentId;
  const [departments, setDepartments] = useState([]);
  const [showDeptSelector, setShowDeptSelector] = useState(true);
  const [schedulableAssignations, setSchedulableAssignations] = useState([]);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = Array.from({ length: 15 }, (_, i) => 7 + i);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('manual');
  const [scheduleVariants, setScheduleVariants] = useState([]);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({ assignation_id: "", room_id: "", day: "", start_time: "", end_time: "" });
  const [rooms, setRooms] = useState([]);
  const [assignations, setAssignations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [notification, setNotification] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [automateType, setAutomateType] = useState('room');
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState(""); // State for selectedSchoolYearId
  const [schoolYears, setSchoolYears] = useState([]); // New state for school years
  const [filteredAssignations, setFilteredAssignations] = useState([]);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedProfessorId, setSelectedProfessorId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const openSettingsModal = () => setIsSettingsOpen(true);
  const closeSettingsModal = () => setIsSettingsOpen(false);
  const selectedRoom = rooms.find(r => r.id === parseInt(formData.room_id));
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const effectiveDeptId = user?.DepartmentId || selectedDeptId;
  const [semesterData, setSemesterData] = useState({});

  const uniqueSemesters = useMemo(() => {
    if (!assignations.length) return [];
    const semesters = [...new Set(assignations.map(a => a.Semester))];
    return semesters.sort((a, b) => a - b);
  }, [assignations]);

  const formatTimeRange = (start, end) => `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
  const calculateEventPosition = event => {
    const [sH, sM] = event.Start_time.split(':').map(Number);
    const [eH, eM] = event.End_time.split(':').map(Number);
    const duration = (eH - sH) + (eM - sM) / 60;
    return { top: `${(sM / 60) * 100}%`, height: `${duration * 100}%` };
  };

  const transformErrorMessage = (message) => {
    if (!message) return message;
    let newMessage = message.replace(/Room\s+(\d+)\b/, (match, roomId) => {
      const room = rooms.find(r => r.id.toString() === roomId);
      return room?.Code ? `Room ${room.Code}` : match;
    });
    return newMessage.replace(/on\s+(\d+)\b/, (match, dayNum) => {
      const dayIndex = parseInt(dayNum, 10) - 1;
      return days[dayIndex] ? `on ${days[dayIndex]}` : match;
    });
  };

  const toggleMode = (mode) => {
    setActiveMode(mode);
    if (mode === 'manual') {
      // Reset automation-specific state if needed
    } else {
      // Reset manual scheduling specific state if needed
    }
  };

  const renderModeToggle = () => {
    return (
      <div className="mb-4 border-b pb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Scheduling Mode</p>
        <div className="flex w-full border rounded-lg overflow-hidden">
          <button onClick={() => toggleMode('manual')} className={`flex-1 py-2 text-sm font-medium transition-colors ${activeMode === 'manual'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Manual Scheduling
          </button>
          <button onClick={() => toggleMode('automation')} className={`flex-1 py-2 text-sm font-medium transition-colors ${activeMode === 'automation'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Automation
          </button>
        </div>
      </div>
    );
  };

  const safeRenderRoomType = (typeRooms) => {
    if (!typeRooms) return '';
    return typeRooms.map(item => item.Type).join(', ')
  };

  // Add function to fetch school years
  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get('/schoolYear/getAllSchoolYears');
      if (response.data.successful) {
        setSchoolYears(response.data.data);
        // If there are school years, select the most recent one by default
        if (response.data.data.length > 0) {
          // Sort by name descending (assuming format "YYYY-YYYY")
          const sortedYears = [...response.data.data].sort((a, b) => b.SY_Name.localeCompare(a.SY_Name));
          setSelectedSchoolYearId(sortedYears[0].id);
        }
      } else {
        console.error("Failed to fetch school years:", response.data.message);
        setNotification({
          type: 'error',
          message: `School years fetch failed: ${response.data.message}`
        });
      }
    } catch (error) {
      console.error("Error fetching school years:", error);
      setNotification({
        type: 'error',
        message: 'Failed to load school years. Please check your network connection.'
      });
    }
  };

  const fetchSchedulableAssignations = async () => {
    if (!effectiveDeptId || !selectedSemester || !selectedSchoolYearId) {
      setSchedulableAssignations([]);
      return;
    }

    try {
      const response = await axios.get(`/assignation/getSchedulableAssignationsByDept/${effectiveDeptId}`, {
        params: {
          Semester: selectedSemester,
          SchoolYearId: selectedSchoolYearId
        }
      });

      if (response.data.successful) {
        setSchedulableAssignations(response.data.data);
      } else {
        console.error("Failed to fetch schedulable assignations:", response.data.message);
        setSchedulableAssignations([]);
      }
    } catch (error) {
      console.error("Error fetching schedulable assignations:", error);
      setSchedulableAssignations([]);
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/dept/getAllDept');
        if (response.data.successful) {
          setDepartments(response.data.data);
        } else {
          console.error("Failed to fetch departments:", response.data.message);
          setNotification({
            type: 'error',
            message: `Department fetch failed: ${response.data.message}`
          });
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
        setNotification({
          type: 'error',
          message: 'Failed to load departments. Please check your network connection.'
        });
      }
    };

    if (showDeptSelector) {
      fetchDepartments();
    }
    fetchSchoolYears();
  }, [showDeptSelector]);

  useEffect(() => {
    if (effectiveDeptId && selectedSemester && selectedSchoolYearId) {
      fetchSchedulableAssignations();
    }
  }, [effectiveDeptId, selectedSemester, selectedSchoolYearId]);

  useEffect(() => {
    if (schedules.length > 0 && effectiveDeptId && selectedSemester && selectedSchoolYearId) {
      fetchSchedulableAssignations();
    }
  }, [schedules]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    if (effectiveDeptId && selectedSchoolYearId) {
      fetchDataForDepartment(effectiveDeptId);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [effectiveDeptId, selectedSchoolYearId]);

  useEffect(() => {
    if (!selectedSemester || !selectedSchoolYearId) {
      setFilteredAssignations([]);
      return;
    }

    if (semesterData && semesterData[selectedSemester]) {
      const filteredBySchoolYear = semesterData[selectedSemester].filter(
        a => a.SchoolYearId === parseInt(selectedSchoolYearId)
      );
      setFilteredAssignations(filteredBySchoolYear);
    } else {
      setFilteredAssignations([]);
    }

    if (formData.room_id) {
      fetchSchedulesForRoom(formData.room_id);
    }
  }, [selectedSemester, semesterData, formData.room_id, selectedSchoolYearId]);

  const fetchSchedulesForRoom = (roomId) => {
    if (!roomId || !selectedSemester || !selectedSchoolYearId) {
      setSchedules([]);
      return;
    }
    axios.post(`/schedule/getSchedsByRoom/${roomId}`, {
      Semester: selectedSemester,
      SchoolYearId: selectedSchoolYearId
    })
      .then(({ data }) => {
        if (data.successful) {
          setSchedules(data.data);
        } else {
          console.error("API returned error:", data.message);
          setSchedules([]);
          setNotification({
            type: 'error',
            message: `Failed to retrieve schedules: ${data.message}`
          });
        }
      })
      .catch(err => {
        console.error("Network or server error:", err);
        setSchedules([]);
        setNotification({
          type: 'error',
          message: 'Network error while fetching schedules'
        });
      });
  };

  function usePersistentState(key, initialValue) {
    const [value, setValue] = useState(() => {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        return initialValue;
      }
    });

    useEffect(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error("Error storing value in sessionStorage:", error);
      }
    }, [key, value]);

    return [value, setValue];
  }

  const deleteSchedule = async (scheduleId) => {
    if (isDeleting || !effectiveDeptId) return;
    setIsDeleting(true);
    try {
      const response = await axios.post(`/schedule/deleteSchedule/${scheduleId}`, { DepartmentId: effectiveDeptId });
      if (response.data.successful) {
        setNotification({ type: 'success', message: "Schedule deleted successfully!" });
        if (formData.room_id) fetchSchedulesForRoom(formData.room_id);
      } else {
        setNotification({ type: 'error', message: transformErrorMessage(response.data.message) });
      }
    } catch (error) {
      setNotification({ type: 'error', message: transformErrorMessage(error.response?.data?.message || "An error occurred while deleting the schedule.") });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!effectiveDeptId) {
      setNotification({ type: 'error', message: "Please select a department first." });
      return;
    }

    if (!selectedSchoolYearId) {
      setNotification({ type: 'error', message: "Please select a school year first." });
      return;
    }

    if (!formData.assignation_id || !formData.room_id || !formData.day || !formData.start_time || !formData.end_time) {
      setNotification({ type: 'error', message: "Please fill in all mandatory fields." });
      return;
    }

    const payload = {
      Day: parseInt(formData.day),
      Start_time: formData.start_time,
      End_time: formData.end_time,
      RoomId: parseInt(formData.room_id),
      AssignationId: parseInt(formData.assignation_id)
    };

    try {
      const response = await axios.post("/schedule/addSchedule", payload);
      if (response.data.successful) {
        setNotification({ type: 'success', message: "Schedule added successfully!" });
        setFormData(prev => ({
          ...prev,
          assignation_id: "",
          day: "",
          start_time: "",
          end_time: "",
        }));
        setCustomStartTime("");
        setCustomEndTime("");
        if (formData.room_id) fetchSchedulesForRoom(formData.room_id);
      } else {
        setNotification({ type: 'error', message: transformErrorMessage(response.data.message) });
      }
    } catch (error) {
      setNotification({ type: 'error', message: transformErrorMessage(error.response?.data?.message || "An error occurred while adding the schedule.") });
    }
  };

  const fetchDataForDepartment = async (departmentId) => {
    try {
      if (!departmentId) {
        console.error("Invalid department ID:", departmentId);
        setNotification({
          type: 'error',
          message: 'Please select a valid department.'
        });
        return;
      }

      if (!selectedSchoolYearId) {
        console.error("No school year selected");
        return;
      }

      // Fetch rooms
      try {
        const roomsRes = await axios.get(`/room/getRoomsByDept/${departmentId}`);
        if (roomsRes.data.successful) {
          setRooms(roomsRes.data.data);
        } else {
          console.error("Failed to fetch rooms:", roomsRes.data.message);
          setRooms([]);
          setNotification({
            type: 'error',
            message: `Room fetch failed: ${roomsRes.data.message}`
          });
        }
      } catch (roomError) {
        console.error("Error fetching rooms:", roomError);
        setRooms([]);
      }

      // Fetch assignations with school year filter
      try {
        const assignationsRes = await axios.get(`/assignation/getAllAssignationsByDeptInclude/${departmentId}`, {
          params: {
            SchoolYearId: selectedSchoolYearId
          }
        });

        if (assignationsRes.data.successful) {
          const assignationsData = assignationsRes.data.data;
          setAssignations(assignationsData);

          const semesterMap = {};
          assignationsData.forEach(a => {
            if (!semesterMap[a.Semester]) {
              semesterMap[a.Semester] = [];
            }
            semesterMap[a.Semester].push(a);
          });

          const semesters = [...new Set(assignationsData.map(a => a.Semester))].sort((a, b) => a - b);
          setSemesterData(semesterMap);
          setSemesters(semesters);

          // If there are semesters, select the first one by default
          if (semesters.length > 0 && !selectedSemester) {
            setSelectedSemester(semesters[0].toString());
          }
        } else {
          console.error("Failed to fetch assignations:", assignationsRes.data.message);
          setAssignations([]);
          setSemesterData({});
        }
      } catch (assignationError) {
        console.error("Error fetching assignations:", assignationError);
        setNotification({
          type: 'error',
          message: 'Unable to load course assignations. There might be a server issue.'
        });
        setAssignations([]);
        setSemesterData({});
      }

    } catch (error) {
      console.error("General error fetching data:", error);
      setNotification({
        type: 'error',
        message: 'Failed to load required data. Please try refreshing.'
      });
    }
  };

  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    setSelectedDeptId(deptId);
    const currentRoomId = formData.room_id;
    resetForm();

    setRooms([]);
    setAssignations([]);
    setSchedules([]);
    setSemesters([]);
    setProfessors([]);

    if (deptId && selectedSchoolYearId) {
      fetchDataForDepartment(deptId);
      if (currentRoomId) {
        setTimeout(() => {
          setFormData(prev => ({ ...prev, room_id: currentRoomId }));
          fetchSchedulesForRoom(currentRoomId);
        }, 1000);
      }
    }
  };

  const handleSchoolYearChange = (e) => {
    const schoolYearId = e.target.value;
    setSelectedSchoolYearId(schoolYearId);
    const deptIdToUse = effectiveDeptId || selectedDeptId;
    resetForm();
    setAssignations([]);
    setSchedules([]);
    setSemesters([]);
    setSelectedSemester("");

    if (deptIdToUse && schoolYearId) {
      fetchDataForDepartment(deptIdToUse);
    }
  };

  useEffect(() => {
    setShowDeptSelector(!user?.DepartmentId);
  }, [user]);

  useEffect(() => {
    setShowDeptSelector(!deptId);
  }, [deptId]);

  const renderDepartmentSelector = () => {
    if (!showDeptSelector) return null;

    return (
      <div className="mb-4 border-b pb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Department:</label>
        <select
          value={selectedDeptId || ''}
          onChange={handleDepartmentChange}
          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select Department</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.Name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderSchoolYearSelector = () => {
    return (
      <div className="mb-4 border-b pb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">School Year:</label>
        <select
          value={selectedSchoolYearId || ''}
          onChange={handleSchoolYearChange}
          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select School Year</option>
          {schoolYears.map(year => (
            <option key={year.id} value={year.id}>
              {year.SY_Name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const handleAutomateSchedule = async () => {
    if (!effectiveDeptId) {
      setNotification({ type: 'error', message: "Please select a department first." });
      return;
    }

    if (!selectedSchoolYearId) {
      setNotification({ type: 'error', message: "Please select a school year first." });
      return;
    }

    setIsAutomating(true);
    try {
      if (automateType === 'room' && !formData.room_id) {
        setNotification({
          type: 'error',
          message: "Please select a room before automating a single room schedule."
        });
        setIsAutomating(false);
        return;
      }

      const payload = {
        DepartmentId: effectiveDeptId,
        semester: selectedSemester,
        SchoolYearId: parseInt(selectedSchoolYearId),
        variantCount: 2,
      };

      if (automateType === 'room') {
        payload.roomId = parseInt(formData.room_id, 10);
      }

      const endpoint = '/schedule/generateScheduleVariants';
      setShowVariantModal(true);

      const response = await axios.post(endpoint, payload);

      if (response.data.successful) {
        const variants = response.data.variants;
        setScheduleVariants(variants);

        localStorage.setItem('scheduleVariants', JSON.stringify({
          variants: variants,
          departmentId: effectiveDeptId,
          timestamp: Date.now()
        }));
        setNotification({
          type: 'success',
          message: `Successfully generated ${variants.length} schedule variants. Please select one to save.`
        });
      } else {
        setNotification({
          type: 'error',
          message: transformErrorMessage(response.data.message)
        });
        setShowVariantModal(false);
      }
    } catch (error) {
      console.error('Schedule variant generation error:', error.response || error);
      setNotification({
        type: 'error',
        message: transformErrorMessage(
          error.response?.data?.message ||
          `An error occurred while generating schedule variants.`
        )
      });
      setShowVariantModal(false);
    } finally {
      setIsAutomating(false);
    }
  };

  const handleSelectVariant = async (variantIndex) => {
    if (!effectiveDeptId || !selectedSchoolYearId) return;

    try {
      const selectedVariant = scheduleVariants[variantIndex];

      const response = await axios.post('/schedule/saveScheduleVariants', {
        variant: selectedVariant,
        DepartmentId: effectiveDeptId,
        semester: selectedSemester,
        SchoolYearId: parseInt(selectedSchoolYearId)
      });

      if (response.data.successful) {
        setNotification({
          type: 'success',
          message: 'Schedule variant saved successfully to the database!'
        });

        setShowVariantModal(false);
        if (formData.room_id) {
          fetchSchedulesForRoom(formData.room_id);
        }
      } else {
        setNotification({
          type: 'error',
          message: transformErrorMessage(response.data.message || 'Failed to save schedule variant')
        });
      }
    } catch (error) {
      console.error('Error saving variant:', error);
      setNotification({
        type: 'error',
        message: transformErrorMessage(
          error.response?.data?.message ||
          'An error occurred while saving the schedule variant'
        )
      });
    }
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    if (name === "semester") {
      setSelectedSemester(value);
      setFormData(prev => ({
        ...prev,
        assignation_id: "",
        professorId: null,
        professorName: null
      }));
      if (formData.room_id) {
        fetchSchedulesForRoom(formData.room_id);
      }
    } else if (name === "assignation_id") {
      if (value) {
        const selectedAssignation = assignations.find(a => a.id === parseInt(value));
        if (selectedAssignation?.CourseId) {
          setFormData(prev => ({
            ...prev,
            [name]: value,
            professorId: selectedAssignation.ProfessorId,
            professorName: selectedAssignation.Professor?.Name || "Professor",
            courseDuration: selectedAssignation.Course?.Duration,
            courseType: selectedAssignation.Course.RoomType?.Type,
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          professorId: null,
          professorName: null
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === "room_id" && value) fetchSchedulesForRoom(value);
  };

  const handleTimeChange = e => {
    const { name, value } = e.target;
    if (name === "custom_start_time") {
      setCustomStartTime(value);
      setFormData(prev => ({ ...prev, start_time: value }));
    } else if (name === "custom_end_time") {
      setCustomEndTime(value);
      setFormData(prev => ({ ...prev, end_time: value }));
    }
  };

  const toggleLockStatus = async (scheduleId, currentLockStatus) => {
    if (!effectiveDeptId) return;

    try {
      const response = await axios.put(`/schedule/toggleLock/${scheduleId}`, { DepartmentId: effectiveDeptId });
      if (response.data.successful) {
        setNotification({ type: 'success', message: `Schedule ${currentLockStatus ? 'unlocked' : 'locked'} successfully!` });
        if (formData.room_id) fetchSchedulesForRoom(formData.room_id);
      } else {
        setNotification({ type: 'error', message: transformErrorMessage(response.data.message) });
      }
    } catch (error) {
      setNotification({ type: 'error', message: transformErrorMessage(error.response?.data?.message || "An error occurred while toggling lock status.") });
    }
  };

  const handleToggleLockAllSchedules = async (lockAction = true) => {
    if (!formData.room_id || schedules.length === 0) {
      setNotification({ type: 'error', message: "No room selected or no schedules to toggle lock status." });
      return;
    }

    try {
      const targetSchedules = lockAction
        ? schedules.filter(schedule => !schedule.isLocked).map(schedule => schedule.id)
        : schedules.filter(schedule => schedule.isLocked).map(schedule => schedule.id);

      if (targetSchedules.length === 0) {
        setNotification({
          type: 'info',
          message: lockAction
            ? "All schedules are already locked."
            : "All schedules are already unlocked."
        });
        return;
      }

      const response = await axios.put("/schedule/toggleLockAllSchedules", {
        scheduleIds: targetSchedules,
        isLocked: lockAction,
        DepartmentId: effectiveDeptId
      });

      if (response.data.successful) {
        setNotification({
          type: 'success',
          message: `Successfully ${lockAction ? 'locked' : 'unlocked'} ${targetSchedules.length} schedules.`
        });
        fetchSchedulesForRoom(formData.room_id);
      } else {
        setNotification({ type: 'error', message: transformErrorMessage(response.data.message) });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: transformErrorMessage(
          error.response?.data?.message || `An error occurred while ${lockAction ? 'locking' : 'unlocking'} schedules.`
        )
      });
    }
  };

  const handleDeleteAllSchedules = async () => {
    if (!effectiveDeptId) {
      setNotification({ type: 'error', message: "Please select a department first." });
      return;
    }

    try {
      const response = await axios.delete(`/schedule/deleteAllDepartmentSchedules/${effectiveDeptId}`, {
        params: {
          SchoolYearId: selectedSchoolYearId
        }
      });

      if (response.data.success) {
        setIsDeleteModalOpen(false);
        setNotification({ type: 'success', message: `Successfully deleted all schedules in the department for the selected school year.` });
        if (formData.room_id) await fetchSchedulesForRoom(formData.room_id);
        setSelectedSchedule(null);
        setSelectedScheduleId(null);
      } else {
        setNotification({ type: 'error', message: transformErrorMessage(response.data.message) });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.message
      });
    }
  };

  const handleCheckAvailability = (professorId) => {
    setSelectedProfessorId(professorId);
    setIsAvailabilityModalOpen(true);
  };

  const resetForm = () => {
    const defaultSemester = semesters.length > 0 ? semesters[0] : "";
    setSelectedSemester(defaultSemester);
    setFormData({ assignation_id: "", room_id: "", day: "", start_time: "", end_time: "" });
    setCustomStartTime("");
    setCustomEndTime("");
    setSchedules([]);
  };

  const ScheduleEvent = ({ schedule }) => {
    const [hovered, setHovered] = useState(false);
    const pos = calculateEventPosition(schedule);

    const sections = schedule.Assignation.ProgYrSecs && schedule.Assignation.ProgYrSecs.length > 0
      ? schedule.Assignation.ProgYrSecs
        .filter(sec => sec && sec.Program)
        .map(sec => `${sec.Program.Code} ${sec.Year}-${sec.Section}`)
        .join(', ')
      : 'No sections';

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`absolute bg-blue-50 p-3 rounded-lg shadow-sm border border-blue-200 left-0 right-0 mx-2 mb-1 transition-all text-blue-700 overflow-y-auto scrollbar-hide ${hovered ? 'z-[9999] scale-110' : 'z-10'}`}
        style={{ top: pos.top, height: hovered ? 'auto' : pos.height }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium">{formatTimeRange(schedule.Start_time, schedule.End_time)}</span>
          <span className="text-xs font-medium bg-blue-100 px-1 rounded">{sections}</span>
        </div>
        <div className="text-sm font-semibold">{schedule.Assignation?.Course?.Code || 'No Course'}</div>
        <div className={`text-xs ${hovered ? '' : 'truncate'}`}>{schedule.Assignation?.Course?.Description || 'No Description'}</div>
        <div className="text-xs">{schedule.Assignation?.Professor?.Name || 'No Professor'}</div>
        {hovered && (
          <div className="mt-2 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <div>Semester: {schedule.Assignation?.Semester || 'N/A'}</div>
              </div>
              <div className="flex">
                <button onClick={(e) => {
                  e.stopPropagation();
                  toggleLockStatus(schedule.id, schedule.isLocked);
                }} className="ml-2 p-1 hover:bg-blue-100 rounded-full transition-colors" title={schedule.isLocked ? "Unlock schedule" : "Lock schedule"}
                >
                  <img src={schedule.isLocked ? lock : unlock} alt={schedule.isLocked ? "Locked" : "Unlocked"} className="w-14 h-14" />
                </button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSchedule(schedule);
                  setIsEditModalOpen(true);
                }} className="ml-2 p-1 hover:bg-blue-100 rounded-full transition-colors">
                  <img src={editBtn} alt="Edit" className="w-10 h-10" />
                </button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  setSelectedScheduleId(schedule.id);
                  setIsDeleteWarningOpen(true);
                }} disabled={isDeleting} className="ml-2 p-1 hover:bg-red-100 rounded-full transition-colors">
                  <img src={delBtn} alt="Delete" className="w-10 h-10" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEventInCell = (hour, dayIndex) => {
    if (!selectedRoom) return null;
    return schedules
      .filter(schedule => {
        const [sH] = schedule.Start_time.split(':').map(Number);
        const [eH, eM] = schedule.End_time.split(':').map(Number);
        return schedule.Day === dayIndex + 1 && sH <= hour && (eH > hour || (eH === hour && eM > 0));
      })
      .map(schedule => {
        if (parseInt(schedule.Start_time.split(':')[0]) !== hour) return null;
        return <ScheduleEvent key={schedule.id} schedule={schedule} />;
      });
  };

  const renderMobileSchedule = (event) => (
    <div key={event.id} className="mb-3 relative">
      <div className="bg-blue-200 text-xs text-blue-800 p-2 m-1 rounded shadow">
        <div className="flex justify-between items-center">
          <div className="font-bold">
            {event.Assignation?.Course?.Code} - {event.Assignation?.Course?.Description}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleLockStatus(event.id, event.isLocked)} className="p-1 hover:bg-blue-100 rounded-full transition-colors" title={event.isLocked ? "Unlock schedule" : "Lock schedule"}
            >
              <img src={event.isLocked ? lock : unlock} alt={event.isLocked ? "Locked" : "Unlocked"} className="w-14 h-14" />
            </button>
            <button onClick={() => { setSelectedSchedule(event); setIsEditModalOpen(true); }} className="p-1 hover:bg-blue-100 rounded-full transition-colors">
              <img src={editBtn} alt="Edit" className="w-10 h-10" />
            </button>
            <button onClick={() => {
              setSelectedScheduleId(event.id);
              setIsDeleteWarningOpen(true);
            }} disabled={isDeleting} className="p-1 hover:bg-red-100 rounded-full transition-colors">
              <img src={delBtn} alt="Delete" className="w-10 h-10" />
            </button>
          </div>
        </div>
        <div className="text-blue-700">
          {event.Start_time.substring(0, 5)} - {event.End_time.substring(0, 5)}
        </div>
        <div>{event.Assignation?.Professor?.Name}</div>
        <div>Semester {event.Assignation?.Semester}</div>
        {event.Assignation.ProgYrSecs?.length > 0 && (
          <div className="mt-1">
            {event.Assignation.ProgYrSecs.map((sec, sIdx) => (
              <span key={sIdx} className="mr-1">
                {sec.Program.Code} {sec.Year}-{sec.Section}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAutomationSection = () => {
    return (
      <div className={`mt-4 ${activeMode !== 'automation' ? 'opacity-50 pointer-events-none' : ''}`}>
        {formData.room_id && schedules.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-10 mb-5">
              <button onClick={() => handleToggleLockAllSchedules(true)} className="flex flex-1 justify-center bg-amber-600 hover:bg-amber-700 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors" disabled={activeMode !== 'automation'}
              >
                Lock All
              </button>
              <button onClick={() => handleToggleLockAllSchedules(false)} className="flex flex-1 justify-center bg-blue-500 hover:bg-blue-600 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors" disabled={activeMode !== 'automation'}
              >
                Unlock All
              </button>
            </div>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex w-full justify-center bg-red-600 hover:bg-red-700 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors mt-2"
              disabled={activeMode !== 'automation'}
            >
              Delete All Department Schedules
            </button>
          </div>
        )}

        <p className="text-sm font-medium text-gray-700 mb-2">Schedule Automation</p>

        <div className="mb-3">
          <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Automation Type:</label>
          <div className="flex gap-4">
            <div className="flex items-center">
              <input type="radio" id="room-automation" name="automate-type" value="room" checked={automateType === 'room'} onChange={() => setAutomateType('room')} className="mr-2" disabled={activeMode !== 'automation'}
              />
              <label htmlFor="room-automation" className="text-xs sm:text-sm text-gray-700">Single Room</label>
            </div>
            <div className="flex items-center">
              <input type="radio" id="all-automation" name="automate-type" value="all" checked={automateType === 'all'} onChange={() => setAutomateType('all')} className="mr-2" disabled={activeMode !== 'automation'}
              />
              <label htmlFor="all-automation" className="text-xs sm:text-sm text-gray-700">All Department Rooms</label>
            </div>
          </div>
        </div>

        {automateType === 'room' && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Selected room will be used for automation</p>
            {!formData.room_id && (
              <p className="text-xs text-red-500">Please select a room first</p>
            )}
          </div>
        )}

        <button onClick={handleAutomateSchedule} disabled={isAutomating || (automateType === 'room' && !formData.room_id) || activeMode !== 'automation' || !selectedSchoolYearId} className={`flex flex-1 justify-center mt-2 ${(automateType === 'room' && !formData.room_id) || activeMode !== 'automation' || !selectedSchoolYearId
          ? 'bg-gray-400'
          : 'bg-green-600 hover:bg-green-700'
          } text-white px-4 py-2 rounded-lg transition-colors`}
        >
          {isAutomating ? "Automating..." : `Automate ${automateType === 'room' ? 'Selected Room' : 'All Rooms'}`}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-800">
      <div className="fixed top-0 h-full z-50">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      </div>
      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <div className="container mx-auto my-50 sm:px-4 sm:pt-54 pb-6 sm:pb-10 flex-1 flex justify-center items-center">
        <div className="bg-gray-100 rounded-lg sm:rounded-xl shadow-lg sm:shadow-xl overflow-hidden w-full max-w-full">
          <div className="bg-blue-600 p-3 sm:p-5 flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white ml-4">Add/Configure Schedule</h1>
              <p className="text-blue-100 mt-1 text-md sm:text-sm ml-4">Create and manage class schedules</p>
            </div>

            <div className="flex flex-row gap-6 items-center mt-16">
              <h5 className='text-white font-semibold'>Reports:</h5>
              <button onClick={() => navigate('/roomTimetable')} className="px-10 py-6 rounded-full text-sm font-medium transition-colors bg-blue-800 text-white hover:bg-blue-500"
              >
                <span className="flex items-center gap-1">
                  <Home size={16} />
                  Room
                </span>
              </button>
              <button onClick={() => navigate('/profTimetable')} className="px-8 py-6 rounded-full text-sm font-medium transition-colors bg-blue-800 text-white hover:bg-blue-500"
              >
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  Professor
                </span>
              </button>
              <button onClick={() => navigate('/sectionTimetable')} className="px-8 py-6 rounded-full text-sm font-medium transition-colors bg-blue-800 text-white hover:bg-blue-500"
              >
                <span className="flex items-center gap-1">
                  <BookOpen size={16} />
                  Section
                </span>
              </button>
              <button onClick={openSettingsModal} className="text-xl transition text-white"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
          {notification && (
            <div className={`mx-4 my-4 p-3 rounded-lg text-sm font-medium border ${notification.type === 'error' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
              {notification.message}
            </div>
          )}

          <div className="flex flex-col lg:flex-row ml-2 p-2">
            <div className="lg:w-1/4 p-3 sm:p-5 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200">
              <div className="space-y-3 sm:space-y-4">
                {renderModeToggle()}
                {renderDepartmentSelector()}
                {/* Add the school year selector */}
                {renderSchoolYearSelector()}
                <div className="flex items-center mt-2">
                  {formData.professorId && formData.professorName && (
                    <button type="button" onClick={() => handleCheckAvailability(formData.professorId)} className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mr-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Check {formData.professorName}&apos;s Availability
                    </button>
                  )}
                </div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Semester:</label>
                <select
                  name="semester"
                  value={selectedSemester}
                  onChange={handleInputChange}
                  className={`w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!selectedSchoolYearId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  disabled={!selectedSchoolYearId}
                >
                  <option value="">Select Semester</option>
                  {semesters.map(semester => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>

                <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Room:</label>
                <select
                  name="room_id"
                  value={formData.room_id}
                  onChange={handleInputChange}
                  className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Room</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.Code} - {room.Building} {room.Floor} (Primary Type: {room.RoomType?.Type || 'None'})
                      (Additional Types: {room.TypeRooms?.map(item => item.Type).join(', ') || 'None'})
                    </option>
                  ))}
                </select>

                <label className={`block text-xs sm:text-sm font-medium mb-1 ${(!selectedSemester || !selectedSchoolYearId) ? 'text-gray-400' : 'text-gray-700'}`}>Assignation:</label>
                <select
                  name="assignation_id"
                  value={formData.assignation_id}
                  onChange={handleInputChange}
                  className={`w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${(!selectedSemester || !selectedSchoolYearId) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={activeMode !== 'manual' || !selectedSemester || !selectedSchoolYearId}
                >
                  <option value="">Select Assignation</option>
                  {schedulableAssignations.map(a => {
                    // Format sections string
                    const sectionsString = a.ProgYrSecs && a.ProgYrSecs.length > 0
                      ? a.ProgYrSecs
                        .filter(sec => sec && sec.Program)
                        .map(sec => `${sec.Program.Code} ${sec.Year}-${sec.Section}`)
                        .join(', ')
                      : 'No sections';

                    // Display remaining hours (included in the API response)
                    const remainingHours = a.remainingHours || 0;
                    const scheduledHours = a.scheduledHours || 0;
                    const courseDuration = a.Course?.Duration || 0;

                    return (
                      <option key={a.id} value={a.id}>
                        {a.Course?.Code} - {a.Course?.Description} | {a.Professor?.Name} | {sectionsString} | {scheduledHours.toFixed(1)}/{courseDuration}h ({remainingHours.toFixed(1)}h remaining)
                      </option>
                    );
                  })}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Day:</label>
                    <select
                      name="day"
                      value={formData.day}
                      onChange={handleInputChange}
                      disabled={activeMode !== 'manual' || !selectedSchoolYearId}
                      className={`w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!selectedSchoolYearId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select Day</option>
                      {days.map((d, i) => (
                        <option key={d} value={i + 1}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Start Time:</label>
                    <input
                      type="time"
                      name="custom_start_time"
                      value={customStartTime}
                      onChange={handleTimeChange}
                      disabled={activeMode !== 'manual' || !selectedSchoolYearId}
                      className={`w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!selectedSchoolYearId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">End Time:</label>
                    <input
                      type="time"
                      name="custom_end_time"
                      value={customEndTime}
                      onChange={handleTimeChange}
                      disabled={activeMode !== 'manual' || !selectedSchoolYearId}
                      className={`w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!selectedSchoolYearId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
                <div className="flex pt-3 sm:pt-4 gap-10">
                  <button onClick={resetForm} className="flex flex-1 justify-center bg-red-500 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-colors">
                    Reset
                  </button>
                  <button
                    onClick={handleAddSchedule}
                    disabled={!selectedSchoolYearId || activeMode !== 'manual'}
                    className={`flex flex-1 justify-center ${!selectedSchoolYearId || activeMode !== 'manual' ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors`}
                  >
                    Save
                  </button>
                </div>
                {renderAutomationSection()}
              </div>
            </div>

            <div className="lg:w-3/4 p-2 sm:p-4">
              <div className="w-full overflow-x-auto">
                {isMobileView ? (
                  <>
                    <div className="flex justify-between items-center bg-gray-50 border-b-2 border-gray-200 p-2 sticky top-0 z-10">
                      <span className="text-gray-700 font-medium text-xs sm:text-sm">Schedule</span>
                      <select className="rounded-lg px-2 py-1 text-xs bg-white border border-gray-200" value={selectedDay} onChange={e => setSelectedDay(parseInt(e.target.value, 10))}>
                        {days.map((d, idx) => (
                          <option key={d} value={idx}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-2">
                      {!schedules.length ? (
                        <div className="text-center py-8 text-gray-500">No schedules available</div>
                      ) : (
                        schedules.filter(event => event.Day === selectedDay + 1).map(event => renderMobileSchedule(event))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="overflow-x-auto" style={{ minWidth: "100%" }}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm text-left w-16 sm:w-20">
                            Time
                          </th>
                          {days.map(d => (
                            <th key={d} className="p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm text-left">
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map(hour => (
                          <tr key={hour} className="hover:bg-gray-50">
                            <td className="p-2 sm:p-3 border-b border-gray-200 text-gray-700 font-medium text-xs sm:text-sm w-16 sm:w-20">
                              {`${hour.toString().padStart(2, '0')}:00`}
                            </td>
                            {days.map((_, idx) => (
                              <td key={idx} className="p-2 border-b border-gray-200 relative h-24">
                                {renderEventInCell(hour, idx)}
                              </td>
                            ))}
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

      <DeleteWarning isOpen={isDeleteWarningOpen} onClose={() => {
        setIsDeleteWarningOpen(false);
        setSelectedScheduleId(null);
      }} onConfirm={() => {
        deleteSchedule(selectedScheduleId);
        setIsDeleteWarningOpen(false);
        setSelectedScheduleId(null);
      }}
      />

      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => {
        handleDeleteAllSchedules();
        setIsDeleteModalOpen(false);
      }} title="Delete Confirmation"
        message={`Are you sure you want to delete ALL schedules in this department for the school year ${schoolYears.find(y => y.id === parseInt(selectedSchoolYearId))?.SY_Name || ''}? This action cannot be undone.`}
      />

      <EditSchedRecordModal isOpen={isEditModalOpen} schedule={selectedSchedule} onClose={() => {
        setIsEditModalOpen(false);
        setSelectedSchedule(null);
      }} onUpdate={() => {
        if (formData.room_id) {
          fetchSchedulesForRoom(formData.room_id);
        }
      }} rooms={rooms} assignations={assignations} Semester={selectedSemester} SchoolYearId={selectedSchoolYearId}
      />

      <SettingsModal isOpen={isSettingsOpen} closeSettingsModal={closeSettingsModal} />

      <ScheduleReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} scheduleData={reportData} />

      <ScheduleVariantModal show={showVariantModal} onHide={() => setShowVariantModal(false)} variants={scheduleVariants} loading={isAutomating} onSelectVariant={handleSelectVariant} departmentId={deptId} schoolYearId={selectedSchoolYearId}
      />

      <ProfAvailabilityModal isOpen={isAvailabilityModalOpen} onClose={() => setIsAvailabilityModalOpen(false)} professorId={selectedProfessorId} schoolYearId={selectedSchoolYearId}
      />
    </div>
  );
}

export default AddConfigSchedule;