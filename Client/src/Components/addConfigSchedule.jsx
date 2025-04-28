import { useState, useEffect, useMemo } from 'react';
import ScheduleReportModal from '../Components/callComponents/scheduleReport.jsx';
import ScheduleVariantModal from '../Components/callComponents/variantSelectHandler.jsx';
import ProfAvailabilityModal from '../Components/callComponents/miniProfAvailabilityModal.jsx';
import axios from '../axiosConfig.js';
import bg from './Img/bg.jpg';
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

const AddConfigSchedule = () => {
  const { user } = useAuth();
  const deptId = user.DepartmentId;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = Array.from({ length: 15 }, (_, i) => 7 + i);

  // State management

  // first 2 are for report modal
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  // new automate
  const navigate = useNavigate();
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
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [professors, setProfessors] = useState([]);
  const [automateType, setAutomateType] = useState('room');
  const [prioritizedProfessors, setPrioritizedProfessors] = useState([]);
  const [prioritizedRooms, setPrioritizedRooms] = useState([]);
  const [newPriorityProfessor, setNewPriorityProfessor] = useState("");
  const [newPriorityRoom, setNewPriorityRoom] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [filteredAssignations, setFilteredAssignations] = useState([]);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedProfessorId, setSelectedProfessorId] = useState(null);

  const selectedRoom = rooms.find(r => r.id === parseInt(formData.room_id));

  const uniqueSemesters = useMemo(() => {
    if (!assignations.length) return [];
    const semesters = [...new Set(assignations.map(a => a.Semester))];
    return semesters.sort((a, b) => a - b);
  }, [assignations]);

  // Helper functions
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

  // Effects
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, assignationsRes, professorsRes] = await Promise.all([
          axios.get(`/room/getRoomsByDept/${deptId}`),
          axios.get(`/assignation/getAllAssignationsByDeptInclude/${deptId}`),
          axios.get(`/prof/getProfByDept/${deptId}`)
        ]);
        if (roomsRes.data.successful) setRooms(roomsRes.data.data);
        if (assignationsRes.data.successful) {
          const assignationsData = assignationsRes.data.data;
          setAssignations(assignationsData);

          // Extract unique semesters from assignations
          const uniqueSemesters = [...new Set(assignationsData.map(a => a.Semester))].sort();
          setSemesters(uniqueSemesters);

          // Set default semester if available
          if (uniqueSemesters.length > 0 && !selectedSemester) {
            setSelectedSemester(uniqueSemesters[0]);
          }
        }
        if (professorsRes.data.successful) setProfessors(professorsRes.data.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();

    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [deptId]);

  useEffect(() => {
    if (selectedSemester) {
      const filtered = assignations.filter(a => a.Semester === selectedSemester);
      setFilteredAssignations(filtered);

      // If a room is already selected, refetch schedules for the new semester
      if (formData.room_id) {
        fetchSchedulesForRoom(formData.room_id);
      }
    } else {
      setFilteredAssignations([]);
    }
  }, [selectedSemester, assignations]);

  // API handlers
  const fetchSchedulesForRoom = (roomId) => {
    if (!roomId || !selectedSemester) {
      setSchedules([]);
      return;
    }

    axios.post(`/schedule/getSchedsByRoom/${roomId}`, { Semester: selectedSemester })
      .then(({ data }) => {
        if (data.successful) {
          setSchedules(data.data);
        } else {
          setSchedules([]);
          console.error("Error fetching schedules:", data.message);
        }
      })
      .catch(err => {
        console.error("Error fetching schedules:", err);
        setSchedules([]);
      });
  };

  const fetchSectionsForCourse = (courseId) => {
    axios.post('/progYrSec/getProgYrSecByCourse', { CourseId: courseId, DepartmentId: deptId })
      .then(({ data }) => {
        if (data.successful) {
          setAvailableSections(data.data);
          setSelectedSections([]);
        } else {
          setAvailableSections([]);
        }
      })
      .catch(err => {
        console.error("Error fetching sections:", err);
        setAvailableSections([]);
      });
  };

  const deleteSchedule = async (scheduleId) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {

      const response = await axios.post(`/schedule/deleteSchedule/${scheduleId}`, { DepartmentId: deptId });
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
    if (!formData.assignation_id || !formData.room_id || !formData.day || !formData.start_time || !formData.end_time) {
      setNotification({ type: 'error', message: "Please fill in all mandatory fields." });
      return;
    }
    if (selectedSections.length === 0) {
      setNotification({ type: 'error', message: "Please select at least one section." });
      return;
    }

    const payload = {
      Day: parseInt(formData.day),
      Start_time: formData.start_time,
      End_time: formData.end_time,
      RoomId: parseInt(formData.room_id),
      AssignationId: parseInt(formData.assignation_id),
      Sections: selectedSections,
      Semester: selectedSemester
    };

    try {
      const response = await axios.post("/schedule/addSchedule", payload);
      if (response.data.successful) {
        setNotification({ type: 'success', message: "Schedule added successfully!" });
        resetForm();
        if (formData.room_id) fetchSchedulesForRoom(formData.room_id);
      } else {
        setNotification({ type: 'error', message: transformErrorMessage(response.data.message) });
      }
    } catch (error) {
      setNotification({ type: 'error', message: transformErrorMessage(error.response?.data?.message || "An error occurred while adding the schedule.") });
    }
  };

  const handleAutomateSchedule = async () => {
    setIsAutomating(true);
    try {
      // First, validate that a room is selected when automating a single room
      if (automateType === 'room' && !formData.room_id) {
        setNotification({
          type: 'error',
          message: "Please select a room before automating a single room schedule."
        });
        setIsAutomating(false);
        return;
      }

      // Prepare basic payload
      const payload = {
        DepartmentId: deptId,
        semester: selectedSemester,
        variantCount: 2,  // Generate 2 variants
        // Use prioritized professors if available
        prioritizedProfessor:
          prioritizedProfessors.length > 0
            ? prioritizedProfessors.map((value) => parseInt(value, 10))
            : undefined,
        // Use prioritized rooms if available
        prioritizedRoom:
          prioritizedRooms.length > 0
            ? prioritizedRooms.map((value) => parseInt(value, 10))
            : undefined,
      };

      // If automating a single room, include the roomId in the payload
      if (automateType === 'room') {
        payload.roomId = parseInt(formData.room_id, 10);
      }

      // Use the schedules/variants endpoint instead of automateSchedule
      const endpoint = '/schedule/generateScheduleVariants';

      // Show modal early to indicate loading to user
      setShowVariantModal(true);

      // Fire the request
      const response = await axios.post(endpoint, payload);

      // console.log("Schedule variants response:", response.data);

      if (response.data.successful) {
        // Store the variants
        const variants = response.data.variants;
        setScheduleVariants(variants);

        // Save to localStorage
        localStorage.setItem('scheduleVariants', JSON.stringify({
          variants: variants,
          departmentId: deptId,
          timestamp: Date.now()
        }));

        // Notify user of success
        setNotification({
          type: 'success',
          message: `Successfully generated ${variants.length} schedule variants. Please select one to save.`
        });
      } else {
        // Backend returned a controlled failure
        setNotification({
          type: 'error',
          message: transformErrorMessage(response.data.message)
        });
        // Hide the modal if we got an error
        setShowVariantModal(false);
      }
    } catch (error) {
      console.error('Schedule variant generation error:', error.response || error);

      // Network / unexpected error
      setNotification({
        type: 'error',
        message: transformErrorMessage(
          error.response?.data?.message ||
          `An error occurred while generating schedule variants.`
        )
      });

      // Hide the modal if we got an error
      setShowVariantModal(false);
    } finally {
      setIsAutomating(false);
    }
  };

  // Add this function to handle saving the selected variant
  const handleSelectVariant = async (variantIndex) => {
    try {
      const selectedVariant = scheduleVariants[variantIndex];

      const response = await axios.post('/schedule/saveScheduleVariants', {
        variant: selectedVariant,
        DepartmentId: deptId,
        semester: selectedSemester  // Add the missing semester parameter
      });

      if (response.data.successful) {
        setNotification({
          type: 'success',
          message: 'Schedule variant saved successfully to the database!'
        });

        setShowVariantModal(false);

        // Refresh schedules for the current room if one is selected
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



  // Input handlers
  const handleInputChange = e => {
    const { name, value } = e.target;

    if (name === "semester") {
      // Update selected semester state immediately
      setSelectedSemester(value);

      // Reset assignation selection when semester changes
      setFormData(prev => ({ ...prev, assignation_id: "", professorId: null, professorName: null }));

      // If a room is already selected, refetch schedules with the new semester
      if (formData.room_id) {
        fetchSchedulesForRoom(formData.room_id);
      }
    } else if (name === "assignation_id" && value) {
      // Rest of your existing assignation handler...
      const selectedAssignation = assignations.find(a => a.id === parseInt(value));
      if (selectedAssignation?.CourseId) {
        fetchSectionsForCourse(selectedAssignation.CourseId);
        setFormData(prev => ({
          ...prev,
          [name]: value,
          professorId: selectedAssignation.ProfessorId,
          professorName: selectedAssignation.Professor?.Name || "Professor"
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

  const handleSectionChange = (e) => {
    const { value, checked } = e.target;
    const numericValue = parseInt(value, 10);
    if (checked) {
      setSelectedSections(prev => [...prev, numericValue]);
    } else {
      setSelectedSections(prev => prev.filter(id => id !== numericValue));
    }
  };

  const handleAddPriorityProfessor = () => {
    if (newPriorityProfessor && !prioritizedProfessors.includes(newPriorityProfessor)) {
      setPrioritizedProfessors(prev => [...prev, newPriorityProfessor]);
      setNewPriorityProfessor("");
    }
  };

  const handleRemovePriorityProfessor = (id) => {
    setPrioritizedProfessors(prev => prev.filter(val => val !== id));
  };

  const handleAddPriorityRoom = () => {
    if (newPriorityRoom && !prioritizedRooms.includes(newPriorityRoom)) {
      setPrioritizedRooms(prev => [...prev, newPriorityRoom]);
      setNewPriorityRoom("");
    }
  };

  const handleRemovePriorityRoom = (id) => {
    setPrioritizedRooms(prev => prev.filter(val => val !== id));
  };

  const toggleLockStatus = async (scheduleId, currentLockStatus) => {
    try {
      const response = await axios.put(`/schedule/toggleLock/${scheduleId}`, { DepartmentId: deptId });
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

  // Rename function to reflect both locking and unlocking capability
  const handleToggleLockAllSchedules = async (lockAction = true) => {
    if (!formData.room_id || schedules.length === 0) {
      setNotification({ type: 'error', message: "No room selected or no schedules to toggle lock status." });
      return;
    }

    try {
      // Get relevant schedule IDs based on lockAction
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

      // Make a PUT request to toggle lock status for all relevant schedules
      const response = await axios.put("/schedule/toggleLockAllSchedules", {
        scheduleIds: targetSchedules,
        isLocked: lockAction,
        DepartmentId: deptId
      });

      if (response.data.successful) {
        setNotification({
          type: 'success',
          message: `Successfully ${lockAction ? 'locked' : 'unlocked'} ${targetSchedules.length} schedules.`
        });
        // Refresh schedules for the room
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
    try {
      // Instead of getting schedules for a specific room, we'll delete all for the department
      const response = await axios.delete(`/schedule/deleteAllDepartmentSchedules/${deptId}`);

      if (response.data.successful) {
        setNotification({ type: 'success', message: `Successfully deleted all schedules in the department.` });
        // Refresh schedules for the current room if one is selected
        if (formData.room_id) {
          fetchSchedulesForRoom(formData.room_id);
        }
      } else {
        setNotification({ type: 'error', message: transformErrorMessage(response.data.message) });
      }
    } catch (error) {
      setNotification({
        successful: 'false',
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
    setAvailableSections([]);
    setSelectedSections([]);
  };
  // Components
  // Original ScheduleEvent component with fix
  const ScheduleEvent = ({ schedule }) => {
    const [hovered, setHovered] = useState(false);
    const pos = calculateEventPosition(schedule);

    // Add a null check for ProgYrSecs before mapping
    const sections = schedule.ProgYrSecs && schedule.ProgYrSecs.length > 0
      ? schedule.ProgYrSecs
        .filter(sec => sec && sec.Program) // Filter out entries with missing data
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
                <div>School Year: {schedule.Assignation?.School_Year || 'N/A'}</div>
                <div>Semester: {schedule.Assignation?.Semester || 'N/A'}</div>
              </div>
              <div className="flex">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLockStatus(schedule.id, schedule.isLocked);
                  }}
                  className="ml-2 p-1 hover:bg-blue-100 rounded-full transition-colors"
                  title={schedule.isLocked ? "Unlock schedule" : "Lock schedule"}
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
            <button
              onClick={() => toggleLockStatus(event.id, event.isLocked)}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              title={event.isLocked ? "Unlock schedule" : "Lock schedule"}
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
        <div>{event.Assignation?.School_Year} / Semester {event.Assignation?.Semester}</div>
        {event.ProgYrSecs?.length > 0 && (
          <div className="mt-1">
            {event.ProgYrSecs.map((sec, sIdx) => (
              <span key={sIdx} className="mr-1">
                {sec.Year}-{sec.Section}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSectionsSelect = () => (
    formData.assignation_id && availableSections.length > 0 && (
      <div className="mb-3">
        <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Sections:</label>
        <div className="p-2 border border-gray-300 rounded-lg bg-white">
          {availableSections.map(section => (
            <div key={section.id} className="mb-1 flex items-center">
              <input
                type="checkbox"
                id={section.id}
                value={section.id}
                checked={selectedSections.includes(section.id)}
                onChange={handleSectionChange}
                className="w-auto h-auto text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={section.id} className="ml-2 text-xs sm:text-sm text-gray-700 cursor-pointer">
                {section.Program.Code} {section.Year}-{section.Section}
              </label>
            </div>
          ))}
        </div>
        {availableSections.length > 0 && (
          <div className="flex justify-end mt-1">
            <button type="button" onClick={() => setSelectedSections(availableSections.map(s => s.id))} className="text-xs text-blue-600 hover:text-blue-800 mr-2">
              Select All
            </button>
            <button type="button" onClick={() => setSelectedSections([])} className="text-xs text-blue-600 hover:text-blue-800">
              Clear All
            </button>
          </div>
        )}
      </div>
    )
  );

  const renderAutomationSection = () => (
    <div className="flex flex-col mt-4 border-t pt-4">
      {/* Lock/Unlock/Delete All buttons section */}
      {formData.room_id && schedules.length > 0 && (
        <div className="mb-4"> {/* Removed mt-3 sm:mt-4 from here */}
          <div className="flex gap-10">
            <button
              onClick={() => handleToggleLockAllSchedules(true)}
              className="flex flex-1 justify-center bg-amber-600 hover:bg-amber-700 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors"
            >
              Lock All
            </button>
            <button
              onClick={() => handleToggleLockAllSchedules(false)}
              className="flex flex-1 justify-center bg-blue-500 hover:bg-blue-600 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors"
            >
              Unlock All
            </button>
          </div>

          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to delete ALL schedules in this department? This action cannot be undone.")) {
                handleDeleteAllSchedules();
              }
            }}
            className="flex w-full justify-center bg-red-600 hover:bg-red-700 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors mt-2"
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
            <input
              type="radio"
              id="room-automation"
              name="automate-type"
              value="room"
              checked={automateType === 'room'}
              onChange={() => setAutomateType('room')}
              className="mr-2"
            />
            <label htmlFor="room-automation" className="text-xs sm:text-sm text-gray-700">Single Room</label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="all-automation"
              name="automate-type"
              value="all"
              checked={automateType === 'all'}
              onChange={() => setAutomateType('all')}
              className="mr-2"
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

      <div className="mb-3">
        <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Priority Professors (Optional):</label>
        <div className="flex items-center gap-2">
          <select
            value={newPriorityProfessor}
            onChange={(e) => setNewPriorityProfessor(e.target.value)}
            className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Professor</option>
            {professors.map(prof => (
              <option key={prof.id} value={prof.id}>
                {prof.Name}
              </option>
            ))}
          </select>
          <button onClick={handleAddPriorityProfessor} className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 py-1 rounded">
            Add
          </button>
        </div>
        {prioritizedProfessors.length > 0 && (
          <ul className="mt-2 space-y-1">
            {prioritizedProfessors.map((id) => {
              const prof = professors.find(p => p.id.toString() === id.toString());
              return (
                <li key={id} className="flex justify-between items-center bg-blue-100 px-2 py-1 rounded text-xs">
                  <span>{prof ? `${prof.Name}` : id}</span>
                  <button onClick={() => handleRemovePriorityProfessor(id)} className="text-red-600 hover:text-red-800">Remove</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mb-3">
        <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Priority Rooms (Optional):</label>
        <div className="flex items-center gap-2">
          <select
            value={newPriorityRoom}
            onChange={(e) => setNewPriorityRoom(e.target.value)}
            className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Room</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.Code} - {room.Building} {room.Floor} (Type: {room.RoomType.Type})
              </option>
            ))}
          </select>
          <button onClick={handleAddPriorityRoom} className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 py-1 rounded">
            Add
          </button>
        </div>
        {prioritizedRooms.length > 0 && (
          <ul className="mt-2 space-y-1">
            {prioritizedRooms.map((id) => {
              const room = rooms.find(r => r.id.toString() === id.toString());
              return (
                <li key={id} className="flex justify-between items-center bg-blue-100 px-2 py-1 rounded text-xs">
                  <span>{room ? `${room.Code} - ${room.Building}` : id}</span>
                  <button onClick={() => handleRemovePriorityRoom(id)} className="text-red-600 hover:text-red-800">Remove</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        onClick={handleAutomateSchedule}
        disabled={isAutomating || (automateType === 'room' && !formData.room_id)}
        className={`flex flex-1 justify-center mt-2 ${automateType === 'room' && !formData.room_id ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg transition-colors`}
      >
        {isAutomating ? "Automating..." : `Automate ${automateType === 'room' ? 'Selected Room' : 'All Rooms'}`}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="fixed top-0 h-full z-50">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      </div>
      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <div className="container mx-auto my-50 sm:px-4 sm:pt-54 pb-6 sm:pb-10 flex-1 flex justify-center items-center">
      <div>
          
        </div>
        <div className="bg-gray-100 rounded-lg sm:rounded-xl shadow-lg sm:shadow-xl overflow-hidden w-full max-w-full">
          <div className="bg-blue-600 p-3 sm:p-5 justify-end text-end items-end">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white ml-4">Add/Configure Schedule</h1>
            <p className="text-blue-100 mt-1 text-md sm:text-sm ml-4">Create and manage class schedules</p>
          </div>
          <div className="mt-3 mb-2 mr-5 space-x-4 sm:mt-8 justify-end text-end items-center">
        <button onClick={() => {
          navigate('/roomTimetable')
        }} className="bg-blue-600 text-white font-semibold px-8 py-4 rounded-full shadow hover:bg-blue-400 duration-300 transition-all text-xs sm:text-sm">
          Room
        </button>
        <button onClick={() => {
          navigate('/profTimetable')
        }} className="bg-blue-600 text-white font-semibold px-8 py-4 rounded-full shadow hover:bg-blue-400 duration-300 transition-all text-xs sm:text-sm">
          Professor
        </button>
        <button onClick={() => {
          navigate('/sectionTimetable')
        }} className="bg-blue-600 text-white font-semibold px-8 py-4 rounded-full shadow hover:bg-blue-400 duration-300 transition-all text-xs sm:text-sm">
          Section
        </button>
        </div>
          {notification && (
            <div className={`mx-4 my-4 p-3 rounded-lg text-sm font-medium border ${notification.type === 'error' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
              {notification.message}
            </div>
          )}

          <div className="flex flex-col lg:flex-row ml-2 p-2">
            <div className="lg:w-1/4 p-3 sm:p-5 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200">
              <div className="space-y-3 sm:space-y-4">

                <div className="flex items-center mt-2">
                  {formData.professorId && formData.professorName && (
                    <button
                      type="button"
                      onClick={() => handleCheckAvailability(formData.professorId)}
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>Select Semester</option>
                  {semesters.map(semester => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>

                <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Room:</label>
                <select name="room_id" value={formData.room_id} onChange={handleInputChange} className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.Code} - {r.Building} {r.Floor} (Type: {r.RoomType.Type})
                    </option>
                  ))}
                </select>

                <label className={`block text-xs sm:text-sm font-medium mb-1 ${!selectedSemester ? 'text-gray-400' : 'text-gray-700'}`}>Assignation:</label>
                <select
                  name="assignation_id"
                  value={formData.assignation_id}
                  onChange={handleInputChange}
                  className={`w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!selectedSemester ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={!selectedSemester}
                >
                  <option value="">Select Assignation</option>
                  {filteredAssignations.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.Course?.Code} - {a.Course?.Description} ({a.Course?.Units} units) | {a.Professor?.Name}
                    </option>
                  ))}
                </select>

                {renderSectionsSelect()}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Day:</label>
                    <select name="day" value={formData.day} onChange={handleInputChange} className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select Day</option>
                      {days.map((d, i) => (
                        <option key={d} value={i + 1}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Start Time:</label>
                    <input type="time" name="custom_start_time" value={customStartTime} onChange={handleTimeChange} className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">End Time:</label>
                    <input type="time" name="custom_end_time" value={customEndTime} onChange={handleTimeChange} className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="flex pt-3 sm:pt-4 gap-10">
                  <button onClick={resetForm} className="flex flex-1 justify-center bg-red-500 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-colors">
                    Reset
                  </button>
                  <button onClick={handleAddSchedule} className="flex flex-1 justify-center bg-blue-600 text-white px-10 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors">
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

      <DeleteWarning
        isOpen={isDeleteWarningOpen}
        onClose={() => {
          setIsDeleteWarningOpen(false);
          setSelectedScheduleId(null);
        }}
        onConfirm={() => {
          deleteSchedule(selectedScheduleId);
          setIsDeleteWarningOpen(false);
          setSelectedScheduleId(null);
        }}
      />

      <EditSchedRecordModal
        isOpen={isEditModalOpen}
        schedule={selectedSchedule}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSchedule(null);
        }}
        onUpdate={(updatedSchedule) => {
          // Fetch the updated schedule with all relations after successful update
          if (formData.room_id) {
            fetchSchedulesForRoom(formData.room_id);
          }
        }}
        rooms={rooms}
        assignations={assignations}
        Semester={selectedSemester}
      />

      <ScheduleReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        scheduleData={reportData}
      />

      <ScheduleVariantModal
        show={showVariantModal}
        onHide={() => setShowVariantModal(false)}
        variants={scheduleVariants}
        loading={isAutomating}
        onSelectVariant={handleSelectVariant}
        departmentId={deptId}
      />

      <ProfAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        professorId={selectedProfessorId}
      />
    </div>
  );
};
export default AddConfigSchedule;