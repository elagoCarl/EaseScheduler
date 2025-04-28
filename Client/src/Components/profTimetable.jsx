import { useState, useEffect } from 'react';
import axios from '../axiosConfig.js';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';
import ExportButton from './callComponents/exportButton.jsx';
import Image3 from './Img/3.jpg';
import { useAuth } from '../Components/authContext.jsx';
import { useNavigate } from 'react-router-dom';

const ProfTimetable = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);
  const [professors, setProfessors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true); // Loading for professors
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [loadingSemesters, setLoadingSemesters] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = Array.from({ length: 15 }, (_, i) => 7 + i);
  const deptId = user.DepartmentId;

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        const { data } = await axios.get(`/assignation/getAllAssignationsByDeptInclude/${deptId}`);
        if (data.successful && data.data.length) {
          // Extract unique semesters from assignations
          const uniqueSemesters = [...new Set(data.data.map(item => item.Semester))].filter(Boolean);
          
          uniqueSemesters.sort((a, b) => b.localeCompare(a)); // Most recent first
          
          setSemesters(uniqueSemesters);
          setSelectedSemester(uniqueSemesters[0] || null);
        } else {
          console.error('No semesters found or API error');
        }
      } catch (error) {
        console.error('Error fetching semesters:', error);
      } finally {
        setLoadingSemesters(false);
      }
    };
    fetchSemesters();
  }, [deptId]);

  // Fetch professors using Axios
  useEffect(() => {
    const fetchProfessors = async () => {
      try {
        const { data } = await axios.get(`/prof/getProfByDept/${deptId}`);
        if (data.successful && data.data.length) {
          setProfessors(data.data);
          setSelectedProf(data.data[0]);
        } else {
          console.error('No professors found or API error');
        }
      } catch (error) {
        console.error('Error fetching professors:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfessors();
  }, [deptId]);

  // Fetch schedules when professor or semester changes using Axios
  useEffect(() => {
    if (!selectedProf || !selectedSemester) return;
    const fetchSchedules = async () => {
      setLoadingSchedules(true);
      try {
        // Send payload with the selected semester
        const { data } = await axios.post(`/schedule/getSchedsByProf/${selectedProf.id}`, { Semester: selectedSemester });
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
  }, [selectedProf, selectedSemester]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const formatTimeRange = (start, end) => `${start.slice(0, 5)} - ${end.slice(0, 5)}`;

  const calculateEventPosition = (event) => {
    const [startHour, startMin] = event.Start_time.split(':').map(Number);
    const [endHour, endMin] = event.End_time.split(':').map(Number);
    const duration = (endHour - startHour) + (endMin - startMin) / 60;
    return { top: `${(startMin / 60) * 100}%`, height: `${duration * 100}%` };
  };

  const getRoomInfo = (schedule) => {
    const room = schedule.Room;
    if (!room) {
      return { code: 'Unknown', building: 'Unknown', floor: '', type: '' };
    }
    return {
      code: room.Code || 'Unknown',
      building: room.Building || 'Unknown',
      floor: room.Floor || '',
      type: room.RoomType?.Type || ''
    };
  };

  const getSectionsInfo = (schedule) => {
    if (!schedule.ProgYrSecs || !Array.isArray(schedule.ProgYrSecs) || schedule.ProgYrSecs.length === 0) {
      return 'No sections data';
    }

    return schedule.ProgYrSecs
      .map(sec => {
        if (!sec || !sec.Program) return 'Unknown';
        return `${sec.Program.Code || 'Unknown'} ${sec.Year || '?'}-${sec.Section || '?'}`;
      })
      .join(', ');
  };

  const ProfScheduleEvent = ({ schedule }) => {
    const [hovered, setHovered] = useState(false);
    const pos = calculateEventPosition(schedule);

    const courseCode = schedule.Assignation?.Course?.Code || 'Unknown Course';
    const courseDesc = schedule.Assignation?.Course?.Description || 'No description available';
    const sections = getSectionsInfo(schedule);
    const room = getRoomInfo(schedule);

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`absolute bg-blue-50 p-2 rounded-lg shadow-sm border border-blue-200 left-0 right-0 mx-1 transition-all text-blue-700 overflow-y-auto scrollbar-hide ${hovered ? 'z-[9999] scale-110' : 'z-10'}`}
        style={{ top: pos.top, height: hovered ? 'auto' : pos.height }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium">{formatTimeRange(schedule.Start_time, schedule.End_time)}</span>
          <span className="text-xs font-medium bg-blue-100 px-1 rounded">{sections}</span>
        </div>
        <div className="text-sm font-semibold">{courseCode}</div>
        <div className={`text-xs ${hovered ? '' : 'truncate'}`}>
          {courseDesc}
        </div>
        <div className="text-xs">
          Room: {room.code}
          {room.building && ` - ${room.building}`}
          {room.floor && `, ${room.floor}`}
          {room.type && ` (${room.type})`}
        </div>
      </div>
    );
  };

  const renderEventInCell = (hour, dayIndex) => {
    if (!selectedProf) return null;
    const apiDayIndex = dayIndex + 1;
    return schedules
      .filter(schedule => {
        if (!schedule.Start_time || !schedule.End_time || schedule.Day !== apiDayIndex) {
          return false;
        }

        const [sHour, sMin] = schedule.Start_time.split(':').map(Number);
        const [eHour, eMin] = schedule.End_time.split(':').map(Number);

        return (
          sHour <= hour &&
          (eHour > hour || (eHour === hour && eMin > 0))
        );
      })
      .map(schedule => {
        if (parseInt(schedule.Start_time.split(':')[0], 10) !== hour) return null;
        return <ProfScheduleEvent key={schedule.id} schedule={schedule} />;
      });
  };

  const renderMobileEvent = (hour, dayIndex) => {
    if (!selectedProf || dayIndex !== selectedDay) return null;
    return renderEventInCell(hour, selectedDay);
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
          {/* Header with professor details */}
          <div className="relative bg-blue-600 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Professor Timetable</h1>
                {selectedProf ? (
                  <div className="text-blue-100 mt-1">
                    <p className="text-lg font-semibold">{selectedProf.Name}</p>
                    <div className="flex flex-col gap-x-4 text-sm mt-1">
                      <span>Professor ID: {selectedProf.id}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-blue-100 mt-1">Loading professor details...</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 sm:mt-0">
              <button
                onClick={() => navigate('/addConfigSchedule')}
                className="bg-white text-blue-600 rounded-full p-3 mr-2 hover:bg-blue-200 duration-300 transition"
                title="Go Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
                {/* Semester Dropdown */}
                <div className="w-full sm:w-auto">
                  <select
                    value={selectedSemester || ''}
                    onChange={e => setSelectedSemester(e.target.value)}
                    className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm w-full"
                    disabled={loadingSemesters}
                  >
                    {loadingSemesters ? (
                      <option>Loading semesters...</option>
                    ) : semesters.length > 0 ? (
                      semesters.map(semester => (
                        <option key={semester} value={semester}>Semester: {semester}</option>
                      ))
                    ) : (
                      <option value="">No semesters available</option>
                    )}
                  </select>
                </div>
                
                {/* Professor Dropdown */}
                <div className="w-full sm:w-auto">
                  <select
                    value={selectedProf ? selectedProf.id : ''}
                    onChange={e =>
                      setSelectedProf(professors.find(p => p.id === parseInt(e.target.value)))
                    }
                    className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm w-full"
                    disabled={loading}
                  >
                    {professors.map(prof => (
                      <option key={prof.id} value={prof.id}>
                        {prof.Name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Export Button */}
                {selectedProf && selectedSemester && !loadingSchedules && (
                  <ExportButton
                    selectedProf={selectedProf}
                    schedules={schedules}
                    days={days}
                    timeSlots={timeSlots}
                  />
                )}
              </div>
            </div>
          </div>
          {/* Calendar */}
          <div className="overflow-x-auto">
            <div className="p-2 sm:p-4">
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
                              {renderEventInCell(hour, dayIndex)}
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
                <div className="flex flex-col bg-gray-50 border-b-2 border-gray-200 p-2">
                  <div className="flex justify-between items-center mb-2">
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
                  <div className="flex items-center justify-between">
                    <select
                      value={selectedSemester || ''}
                      onChange={e => setSelectedSemester(e.target.value)}
                      className="rounded-lg px-2 py-1 text-sm bg-white text-gray-800 border border-gray-200 flex-grow mr-2"
                      disabled={loadingSemesters}
                    >
                      {loadingSemesters ? (
                        <option>Loading...</option>
                      ) : semesters.length > 0 ? (
                        semesters.map(semester => (
                          <option key={semester} value={semester}>Semester: {semester}</option>
                        ))
                      ) : (
                        <option value="">No semesters</option>
                      )}
                    </select>
                    {selectedProf && selectedSemester && !loadingSchedules && (
                      <ExportButton
                        selectedProf={selectedProf}
                        schedules={schedules}
                        days={days}
                        timeSlots={timeSlots}
                      />
                    )}
                  </div>
                </div>
                {loadingSchedules ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600" />
                    <span className="ml-3 text-blue-600 font-medium text-sm">Loading schedule...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <table className="w-full border-collapse">
                      <tbody>
                        {timeSlots.map(hour => (
                          <tr key={hour} className="hover:bg-gray-50">
                            <td className="p-2 border-b border-gray-200 text-gray-700 font-medium text-xs w-16">
                              {`${hour.toString().padStart(2, '0')}:00`}
                            </td>
                            <td className="p-0 border-b border-gray-200 relative h-24">
                              {renderMobileEvent(hour, selectedDay)}
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
  );
};

export default ProfTimetable;