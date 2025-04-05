import { useState, useEffect } from 'react';
import axios from 'axios';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';
import Image3 from './Img/3.jpg';
import { useAuth } from '../Components/authContext.jsx';

const RoomTimetable = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const { user } = useAuth();
  console.log("UUUUUUUUUUUUUSSSSERR: ", user);
  console.log("useridDDDDDDDDDDDDDDept: ", user.DepartmentId);
  const DeptId = user.DepartmentId;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = Array.from({ length: 15 }, (_, i) => 7 + i);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await axios.get(`http://localhost:8080/room/getRoomsByDept/${DeptId}`);
        if (data.successful && data.data.length) {
          setRooms(data.data);
          setSelectedRoom(data.data[0]);
        } else {
          console.error('No rooms found or API error');
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };
    fetchRooms();
  }, []);

  // Fetch schedules when selectedRoom changes
  useEffect(() => {
    if (!selectedRoom) return;
    const fetchSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const { data } = await axios.get(`http://localhost:8080/schedule/getSchedsByRoom/${selectedRoom.id}`);
        if (data.successful) {
          setSchedules(data.data);
        } else {
          console.error('Error fetching schedules:', data.message);
          setSchedules([]);
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
        setSchedules([]);
      } finally {
        setLoadingSchedules(false);
      }
    };
    fetchSchedules();
  }, [selectedRoom]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const formatTimeRange = (start, end) => `${start.slice(0, 5)} - ${end.slice(0, 5)}`;

  const calculateEventPosition = (event) => {
    const [sHour, sMin] = event.Start_time.split(':').map(Number);
    const [eHour, eMin] = event.End_time.split(':').map(Number);
    const duration = (eHour - sHour) + ((eMin - sMin) / 60);
    return { top: `${(sMin / 60) * 100}%`, height: `${duration * 100}%` };
  };

  // New component similar to ScheduleEvent in AddConfigSchedule
  const RoomScheduleEvent = ({ schedule }) => {
    const [hovered, setHovered] = useState(false);
    const pos = calculateEventPosition(schedule);
    const sections = schedule.ProgYrSecs
      .map(sec => `${sec.Program.Code} ${sec.Year}-${sec.Section}`)
      .join(', ');
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
      </div>
    );
  };

  // Modified render function to use RoomScheduleEvent
  const renderEvent = (hour, dayIndex, isMobile = false) => {
    if (isMobile && dayIndex !== selectedDay) return null;
    const apiDayIndex = dayIndex + 1;
    return schedules
      .filter(schedule => {
        const [sHour, sMin] = schedule.Start_time.split(':').map(Number);
        const [eHour, eMin] = schedule.End_time.split(':').map(Number);
        return (
          schedule.Day === apiDayIndex &&
          sHour <= hour &&
          (eHour > hour || (eHour === hour && eMin > 0))
        );
      })
      .map(schedule => {
        // Only render event component when the start hour equals the cell hour
        if (parseInt(schedule.Start_time.split(':')[0], 10) !== hour) return null;
        return <RoomScheduleEvent key={schedule.id} schedule={schedule} />;
      });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${Image3})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="fixed top-0 h-full z-50">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </div>
      <TopMenu toggleSidebar={toggleSidebar} />
      <div className="container mx-auto px-2 sm:px-4 pt-20 pb-10 flex-1 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full">
          {/* Header */}
          {/* Header */}
          <div className="bg-blue-600 p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Room Timetable</h1>
                {selectedRoom ? (
                  <div className="text-blue-100 mt-1">
                    <p className="text-lg font-semibold">Room {selectedRoom.Code}</p>
                    <div className="flex flex-row gap-x-4 text-sm mt-1">
                      <span>{selectedRoom.Floor} Floor</span>
                      <span>•</span>
                      <span>{selectedRoom.Building} Building</span>
                      <span>•</span>
                      <span>{selectedRoom.Type}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-blue-100 mt-1">Loading room details...</p>
                )}
              </div>
              <div className="mt-1">
                <select
                  value={selectedRoom?.id || ''}
                  onChange={e =>
                    setSelectedRoom(rooms.find(r => r.id === parseInt(e.target.value)))
                  }
                  className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      Room {room.Code} - {room.Building}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {/* Timetable */}
          <div className="overflow-x-auto">
            <div className="p-2 sm:p-4 min-w-[600px]">
              {/* Desktop View */}
              <div className="hidden md:block">
                {loadingSchedules ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
                    <span className="ml-3 text-blue-600 font-medium">Loading schedule...</span>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm text-left w-16 sm:w-20">
                          Time
                        </th>
                        {days.map(day => (
                          <th
                            key={day}
                            className="p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm text-left"
                          >
                            {day}
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
                          {days.map((_, dayIndex) => (
                            <td key={dayIndex} className="p-0 border-b border-gray-200 relative h-24 sm:h-28">
                              {renderEvent(hour, dayIndex)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Mobile View */}
              <div className="md:hidden">
                <div className="flex justify-start bg-gray-50 border-b-2 border-gray-200 p-2 gap-8">
                  <span className="text-gray-700 font-medium text-sm">Time</span>
                  <select
                    className="rounded-lg px-2 py-1 text-sm bg-white text-gray-800 border border-gray-200"
                    value={selectedDay}
                    onChange={e => setSelectedDay(parseInt(e.target.value))}
                  >
                    {days.map((day, idx) => (
                      <option key={day} value={idx}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                {loadingSchedules ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600" />
                    <span className="ml-3 text-blue-600 font-medium text-sm">Loading schedule...</span>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <tbody>
                      {timeSlots.map(hour => (
                        <tr key={hour} className="hover:bg-gray-50">
                          <td className="p-2 border-b border-gray-200 text-gray-700 font-medium text-xs w-16">
                            {`${hour.toString().padStart(2, '0')}:00`}
                          </td>
                          <td className="p-0 border-b border-gray-200 relative h-24">
                            {renderEvent(hour, selectedDay, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomTimetable;
