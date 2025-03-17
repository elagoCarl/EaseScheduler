import { useState, useEffect } from 'react';
import axios from 'axios';
import bg from './Img/bg.jpg';
import delBtn from './Img/delBtn.png';
import editBtn from './Img/editBtn.png';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';
import DeleteWarning from './callComponents/deleteWarning.jsx';
import EditSchedRecordModal from './callComponents/editSchedRecordModal.jsx'; // New modal import

const AddConfigSchedule = () => {
  const deptId = 1;
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

  // Delete modal state
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = Array.from({ length: 15 }, (_, i) => 7 + i);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, assignationsRes] = await Promise.all([
          axios.get(`http://localhost:8080/room/getRoomsByDept/${deptId}`),
          axios.get(`http://localhost:8080/assignation/getAllAssignationsByDeptInclude/${deptId}`)
        ]);
        if (roomsRes.data.successful) setRooms(roomsRes.data.data);
        if (assignationsRes.data.successful) setAssignations(assignationsRes.data.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [deptId]);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "room_id" && value) {
      fetchSchedulesForRoom(value);
    }
  };

  const fetchSchedulesForRoom = (roomId) => {
    axios.get(`http://localhost:8080/schedule/getSchedsByRoom/${roomId}`)
      .then(({ data }) => setSchedules(data.successful ? data.data : []))
      .catch(err => {
        console.error("Error fetching schedules:", err);
        setSchedules([]);
      });
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

  const resetForm = () => {
    setFormData({ assignation_id: "", room_id: "", day: "", start_time: "", end_time: "" });
    setCustomStartTime("");
    setCustomEndTime("");
    setSchedules([]);
  };

  const formatTimeRange = (start, end) => `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
  const calculateEventPosition = event => {
    const [sH, sM] = event.Start_time.split(':').map(Number);
    const [eH, eM] = event.End_time.split(':').map(Number);
    const duration = (eH - sH) + (eM - sM) / 60;
    return { top: `${(sM / 60) * 100}%`, height: `${duration * 100}%` };
  };

  const deleteSchedule = async (scheduleId) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await axios.delete(`http://localhost:8080/schedule/deleteSchedule/${scheduleId}`);
      if (response.data.successful) {
        setNotification({ type: 'success', message: "Schedule deleted successfully!" });
        if (formData.room_id) {
          fetchSchedulesForRoom(formData.room_id);
        }
      } else {
        setNotification({ type: 'error', message: response.data.message });
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      setNotification({ type: 'error', message: error.response?.data?.message || "An error occurred while deleting the schedule." });
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedRoom = rooms.find(r => r.id === parseInt(formData.room_id));

  // ScheduleEvent now includes both edit and delete buttons.
  const ScheduleEvent = ({ schedule }) => {
    const [hovered, setHovered] = useState(false);
    const pos = calculateEventPosition(schedule);
    const sections = schedule.ProgYrSecs.map(sec => `${sec.Program.Code} ${sec.Year}-${sec.Section}`).join(', ');

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
        <div className="text-sm font-semibold">{schedule.Assignation.Course.Code}</div>
        <div className={`text-xs ${hovered ? '' : 'truncate'}`}>
          {schedule.Assignation.Course.Description}
        </div>
        <div className="text-xs">{schedule.Assignation.Professor.Name}</div>
        {hovered && (
          <div className="mt-2 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <div>School Year: {schedule.Assignation.School_Year}</div>
                <div>Semester: {schedule.Assignation.Semester}</div>
              </div>
              <div className="flex">
                {/* Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSchedule(schedule);
                    setIsEditModalOpen(true);
                  }}
                  className="ml-2 p-1 hover:bg-blue-100 rounded-full transition-colors"
                  title="Edit schedule"
                >
                  <img src={editBtn} alt="Edit" className="w-10 h-10" />
                </button>
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedScheduleId(schedule.id);
                    setIsDeleteWarningOpen(true);
                  }}
                  disabled={isDeleting}
                  className="ml-2 p-1 hover:bg-red-100 rounded-full transition-colors"
                  title="Delete schedule"
                >
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
        const [sH, sM] = schedule.Start_time.split(':').map(Number);
        const [eH, eM] = schedule.End_time.split(':').map(Number);
        return schedule.Day === dayIndex + 1 && sH <= hour && (eH > hour || (eH === hour && eM > 0));
      })
      .map(schedule => {
        if (parseInt(schedule.Start_time.split(':')[0]) !== hour) return null;
        return <ScheduleEvent key={schedule.id} schedule={schedule} />;
      });
  };

  const handleAddSchedule = async () => {
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
      const response = await axios.post("http://localhost:8080/schedule/addSchedule", payload);
      if (response.data.successful) {
        setNotification({ type: 'success', message: "Schedule added successfully!" });
        resetForm();
        if (formData.room_id) {
          fetchSchedulesForRoom(formData.room_id);
        }
      } else {
        setNotification({ type: 'error', message: response.data.message });
      }
    } catch (error) {
      console.error("Error adding schedule", error);
      setNotification({ type: 'error', message: error.response?.data?.message || "An error occurred while adding the schedule." });
    }
  };

  const renderMobileSchedule = (event) => {
    return (
      <div key={event.id} className="mb-3 relative">
        <div className="bg-blue-200 text-xs text-blue-800 p-2 m-1 rounded shadow">
          <div className="flex justify-between items-center">
            <div className="font-bold">
              {event.Assignation?.Course?.Code} - {event.Assignation?.Course?.Description}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectedSchedule(event); setIsEditModalOpen(true); }}
                className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                title="Edit schedule"
              >
                <img src={editBtn} alt="Edit" className="w-10 h-10" />
              </button>
              <button
                onClick={() => {
                  setSelectedScheduleId(event.id);
                  setIsDeleteWarningOpen(true);
                }}
                disabled={isDeleting}
                className="p-1 hover:bg-red-100 rounded-full transition-colors"
                title="Delete schedule"
              >
                <img src={delBtn} alt="Delete" className="w-10 h-10" />
              </button>
            </div>
          </div>
          <div className="text-blue-700">
            {event.Start_time.substring(0, 5)} - {event.End_time.substring(0, 5)}
          </div>
          <div>{event.Assignation?.Professor?.Name}</div>
          <div>
            {event.Assignation?.School_Year} / Semester {event.Assignation?.Semester}
          </div>
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
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="fixed top-0 h-full z-50">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      </div>
      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <div className="container mx-auto my-50 px-2 sm:px-4 pt-20 sm:pt-54 pb-6 sm:pb-10 flex-1 flex justify-center items-center">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg sm:shadow-xl overflow-hidden w-full max-w-full">
          <div className="bg-blue-600 p-3 sm:p-5">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Add/Configure Schedule</h1>
            <p className="text-blue-100 mt-1 text-xs sm:text-sm">Create and manage class schedules</p>
          </div>
          {notification && (
            <div className={`mx-4 my-4 p-3 rounded-lg text-sm font-medium border ${notification.type === 'error' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
              {notification.message}
            </div>
          )}
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-1/4 p-3 sm:p-5 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200">
              <div className="space-y-3 sm:space-y-4">
                <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Room:</label>
                <select
                  name="room_id"
                  value={formData.room_id}
                  onChange={handleInputChange}
                  className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.Code} - {r.Building} {r.Floor} (Type: {r.Type})
                    </option>
                  ))}
                </select>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Assignation:</label>
                <select
                  name="assignation_id"
                  value={formData.assignation_id}
                  onChange={handleInputChange}
                  className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Assignation</option>
                  {assignations.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.Course?.Code} - {a.Course?.Description} ({a.Course?.Units} units) | {a.Professor?.Name} - Total: {a.Professor?.Total_units} units | Dept: {a.Department?.Name}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Day:</label>
                    <select
                      name="day"
                      value={formData.day}
                      onChange={handleInputChange}
                      className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Day</option>
                      {days.map((d, i) => (
                        <option key={d} value={i + 1}>
                          {d}
                        </option>
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
                      className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">End Time:</label>
                    <input
                      type="time"
                      name="custom_end_time"
                      value={customEndTime}
                      onChange={handleTimeChange}
                      className="w-full p-1.5 sm:p-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-between pt-3 sm:pt-4">
                  <button
                    onClick={resetForm}
                    className="bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleAddSchedule}
                    className="bg-blue-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:w-3/4 p-2 sm:p-4 ">
              <div className="w-full overflow-x-auto">
                {isMobileView ? (
                  <>
                    <div className="flex justify-between items-center bg-gray-50 border-b-2 border-gray-200 p-2 sticky top-0 z-10">
                      <span className="text-gray-700 font-medium text-xs sm:text-sm">Schedule</span>
                      <select
                        className="rounded-lg px-2 py-1 text-xs bg-white border border-gray-200"
                        value={selectedDay}
                        onChange={e => setSelectedDay(parseInt(e.target.value, 10))}
                      >
                        {days.map((d, idx) => (
                          <option key={d} value={idx}>
                            {d}
                          </option>
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
                            <th
                              key={d}
                              className="p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm text-left"
                            >
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
                              <td key={idx} className="p-2 border-b border-gray-200 relative h-24 sm:h-28">
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
      {/* DeleteWarning Modal for schedule deletion */}
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
      {/* EditSchedRecordModal for schedule editing */}
      <EditSchedRecordModal
        isOpen={isEditModalOpen}
        schedule={selectedSchedule}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSchedule(null);
        }}
        onUpdate={(updatedSchedule) => {
          setSchedules(prev => prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
        }}
        rooms={rooms}
        assignations={assignations}
      />


    </div>
  );
};

export default AddConfigSchedule;
