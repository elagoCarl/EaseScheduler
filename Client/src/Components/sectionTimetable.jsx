import { useState, useEffect } from 'react';
import axios from 'axios';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';
import Image3 from './Img/3.jpg';

const SectionTimetable = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);

  // Filter data
  const [programs, setPrograms] = useState([]);
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);

  // Selected filters
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Filtered schedules based on selected filters
  const [filteredSchedules, setFilteredSchedules] = useState([]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = Array.from({ length: 15 }, (_, i) => 7 + i);

  // Fetch all schedules and extract filter options
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const deptId = '1'; // Hardcoded department ID
        const { data } = await axios.get(`http://localhost:8080/schedule/getSchedsByDept/${deptId}`);
        if (data.successful && data.data.length) {
          const scheds = data.data;
          setSchedules(scheds);

          // Extract unique programs, years, and sections
          const uniquePrograms = [];
          const uniqueYears = [];
          const uniqueSections = [];
          scheds.forEach(schedule => {
            schedule.ProgYrSecs.forEach(prog => {
              if (!uniquePrograms.find(p => p.id === prog.Program.id)) {
                uniquePrograms.push(prog.Program);
              }
              if (!uniqueYears.includes(prog.Year)) {
                uniqueYears.push(prog.Year);
              }
              if (!uniqueSections.includes(prog.Section)) {
                uniqueSections.push(prog.Section);
              }
            });
          });

          // Sort and update state
          setPrograms(uniquePrograms.sort((a, b) => a.Code.localeCompare(b.Code)));
          setYears(uniqueYears.sort((a, b) => a - b));
          setSections(uniqueSections.sort());

          // Set initial selections
          if (uniquePrograms.length) setSelectedProgram(uniquePrograms[0].id);
          if (uniqueYears.length) setSelectedYear(uniqueYears[0]);
          if (uniqueSections.length) setSelectedSection(uniqueSections[0]);
        } else {
          console.error('No schedules found or API error');
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  // Filter schedules when filters or schedules change
  useEffect(() => {
    if (schedules.length === 0) return;
    const filtered = schedules.filter(schedule =>
      schedule.ProgYrSecs.some(prog =>
        (!selectedProgram || prog.Program.id === selectedProgram) &&
        (!selectedYear || prog.Year === selectedYear) &&
        (!selectedSection || prog.Section === selectedSection)
      )
    );
    setFilteredSchedules(filtered);
  }, [schedules, selectedProgram, selectedYear, selectedSection]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const formatTimeRange = (start, end) => `${start.slice(0, 5)} - ${end.slice(0, 5)}`;

  const calculateEventPosition = (event) => {
    const [startHour, startMin] = event.Start_time.split(':').map(Number);
    const [endHour, endMin] = event.End_time.split(':').map(Number);
    const duration = (endHour - startHour) + (endMin - startMin) / 60;
    return { top: `${(startMin / 60) * 100}%`, height: `${duration * 100}%` };
  };

  // Render event for both desktop and mobile views
  const renderEvent = (hour, dayIndex) => {
    const apiDayIndex = dayIndex + 1;
    return filteredSchedules
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
        if (parseInt(schedule.Start_time.split(':')[0]) !== hour) return null;
        const pos = calculateEventPosition(schedule);
        const sectionsStr = schedule.ProgYrSecs
          .map(sec => `${sec.Program.Code} ${sec.Year}-${sec.Section}`)
          .join(', ');
        return (
          <div
            key={schedule.id}
            className="absolute bg-blue-50 p-2 rounded-lg shadow-sm border border-blue-200 left-0 right-0 mx-1 transition-all hover:shadow-md hover:scale-[1.02] text-blue-700 overflow-y-auto scrollbar-hide"
            style={{ top: pos.top, height: pos.height, zIndex: 10 }}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium">
                {formatTimeRange(schedule.Start_time, schedule.End_time)}
              </span>
              <span className="text-xs font-medium bg-blue-100 px-1 rounded">{sectionsStr}</span>
            </div>
            <div className="text-sm font-semibold">{schedule.Assignation.Course.Code}</div>
            <div className="text-xs truncate">{schedule.Assignation.Course.Description}</div>
            <div className="text-xs">{schedule.Assignation.Professor.Name}</div>
            <div className="text-xs italic">
              Room {schedule.Assignation.Rooms && schedule.Assignation.Rooms[0]?.Code} - {schedule.Assignation.Rooms && schedule.Assignation.Rooms[0]?.Building}
            </div>
          </div>
        );
      });
  };

  // Mobile view: render event only for the selected day
  const renderMobileEvent = (hour, dayIndex) => {
    if (dayIndex !== selectedDay) return null;
    return renderEvent(hour, selectedDay);
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
          {/* Header with filters */}
          <div className="relative bg-blue-600 p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Section Timetable</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4">
              {/* Program Dropdown */}
              <div className="flex flex-col">
                <label className="text-blue-100 text-sm mb-1">Program</label>
                <select
                  value={selectedProgram || ''}
                  onChange={e => setSelectedProgram(e.target.value ? parseInt(e.target.value) : null)}
                  className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.Code}
                    </option>
                  ))}
                </select>
              </div>
              {/* Year Dropdown */}
              <div className="flex flex-col">
                <label className="text-blue-100 text-sm mb-1">Year</label>
                <select
                  value={selectedYear || ''}
                  onChange={e => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                  className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              {/* Section Dropdown */}
              <div className="flex flex-col">
                <label className="text-blue-100 text-sm mb-1">Section</label>
                <select
                  value={selectedSection || ''}
                  onChange={e => setSelectedSection(e.target.value || null)}
                  className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {sections.map(section => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedProgram && selectedYear && selectedSection && (
              <div className="text-blue-100 mt-3 text-lg">
                Viewing: {programs.find(p => p.id === selectedProgram)?.Code} Year {selectedYear} Section {selectedSection}
              </div>
            )}
          </div>
          {/* Calendar */}
          <div className="overflow-x-auto">
            <div className="p-2 sm:p-4 min-w-[600px]">
              {/* Desktop View */}
              <div className="hidden md:block">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
                    <span className="ml-3 text-blue-600 font-medium">Loading schedules...</span>
                  </div>
                ) : (
                  filteredSchedules.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <span className="text-gray-500 font-medium">No schedules found for the selected filters</span>
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
                  )
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
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600" />
                    <span className="ml-3 text-blue-600 font-medium text-sm">Loading schedules...</span>
                  </div>
                ) : (
                  filteredSchedules.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <span className="text-gray-500 font-medium text-sm">No schedules found for the selected filters</span>
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
                              {renderMobileEvent(hour, selectedDay)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionTimetable;
