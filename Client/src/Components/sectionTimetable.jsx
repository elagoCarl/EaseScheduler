import { useState, useEffect } from 'react';
import axios from '../axiosConfig.js';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';
import ExportButton from './callComponents/exportButton.jsx';
import Image3 from './Img/3.jpg';
import { useAuth } from '../Components/authContext.jsx';
import { useNavigate } from 'react-router-dom';

const SectionTimetable = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [programs, setPrograms] = useState([]);
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  // Add school year state variables
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [loadingSchoolYears, setLoadingSchoolYears] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = Array.from({ length: 15 }, (_, i) => 7 + i);

  // Fetch school years
  useEffect(() => {
    const fetchSchoolYears = async () => {
      try {
        setLoadingSchoolYears(true);
        const { data } = await axios.get('/schoolYear/getAllSchoolYears');
        if (data.successful && data.data.length) {
          setSchoolYears(data.data);
          setSelectedSchoolYear(data.data[0]?.id || null);
        } else {
          console.error('No school years found or API error');
        }
      } catch (error) {
        console.error('Error fetching school years:', error);
      } finally {
        setLoadingSchoolYears(false);
      }
    };
    fetchSchoolYears();
  }, []);

  // Fetch semesters based on selected school year
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        if (!user || !user.DepartmentId || !selectedSchoolYear) {
          console.error('User, DepartmentId, or SchoolYear is missing');
          return;
        }

        const deptId = user.DepartmentId;
        const { data } = await axios.get(`/assignation/getAllAssignationsByDeptInclude/${deptId}?SchoolYearId=${selectedSchoolYear}`);

        if (data.successful && data.data && data.data.length) {
          // Extract unique semesters from assignations
          const uniqueSemesters = [...new Set(data.data
            .filter(assignation => assignation.Semester)
            .map(assignation => assignation.Semester))]
            .sort();

          setSemesters(uniqueSemesters);

          // Set initial selection if semesters available
          if (uniqueSemesters.length) {
            setSelectedSemester(uniqueSemesters[0]);
          } else {
            setSelectedSemester(null);
          }
        } else {
          console.error('No assignations found or API error');
          setSemesters([]);
          setSelectedSemester(null);
        }
      } catch (error) {
        console.error('Error fetching semesters:', error);
        setSemesters([]);
        setSelectedSemester(null);
      }
    };

    if (selectedSchoolYear) {
      fetchSemesters();
    }
  }, [user, selectedSchoolYear]);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        if (!user || !user.DepartmentId || !selectedSemester || !selectedSchoolYear) {
          console.error('User, DepartmentId, Semester, or SchoolYear is missing');
          setLoading(false);
          return;
        }

        const deptId = user.DepartmentId;
        // Include selectedSemester and selectedSchoolYear in the payload
        const { data } = await axios.post(`/schedule/getSchedsByDept/${deptId}`, {
          Semester: selectedSemester,
          SchoolYearId: selectedSchoolYear
        });

        console.log('API Response:', data);

        if (data.successful && data.data && data.data.length) {
          const scheds = data.data;
          console.log('First schedule item:', scheds[0]);

          setSchedules(scheds);

          const uniquePrograms = [];
          const uniqueYears = [];
          const uniqueSections = [];

          scheds.forEach(schedule => {
            // Check for Assignation.ProgYrSecs instead of ProgYrSecs directly
            if (schedule.Assignation && schedule.Assignation.ProgYrSecs && schedule.Assignation.ProgYrSecs.length > 0) {
              schedule.Assignation.ProgYrSecs.forEach(prog => {
                if (prog.Program && !uniquePrograms.find(p => p.id === prog.Program.id)) {
                  uniquePrograms.push(prog.Program);
                }
                if (prog.Year && !uniqueYears.includes(prog.Year)) {
                  uniqueYears.push(prog.Year);
                }
                if (prog.Section && !uniqueSections.includes(prog.Section)) {
                  uniqueSections.push(prog.Section);
                }
              });
            }
          });

          setPrograms(uniquePrograms.sort((a, b) => a.Code?.localeCompare(b.Code || '') || 0));
          setYears(uniqueYears.sort((a, b) => a - b));
          setSections(uniqueSections.sort());

          if (uniquePrograms.length) setSelectedProgram(uniquePrograms[0].id);
          if (uniqueYears.length) setSelectedYear(uniqueYears[0]);
          if (uniqueSections.length) setSelectedSection(uniqueSections[0]);
        } else {
          console.error('No schedules found or API error');
          setSchedules([]);
          setPrograms([]);
          setYears([]);
          setSections([]);
          setSelectedProgram(null);
          setSelectedYear(null);
          setSelectedSection(null);
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    if (selectedSemester && selectedSchoolYear) {
      setLoading(true);
      fetchSchedules();
    }
  }, [user, selectedSemester, selectedSchoolYear]);

  useEffect(() => {
    if (schedules.length === 0) return;
    const filtered = schedules.filter(schedule =>
      schedule.Assignation &&
      schedule.Assignation.ProgYrSecs &&
      schedule.Assignation.ProgYrSecs.length > 0 &&
      schedule.Assignation.ProgYrSecs.some(prog =>
        (!selectedProgram || (prog.Program && prog.Program.id === selectedProgram)) &&
        (!selectedYear || prog.Year === selectedYear) &&
        (!selectedSection || prog.Section === selectedSection)
      )
    );
    setFilteredSchedules(filtered);
  }, [schedules, selectedProgram, selectedYear, selectedSection]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const formatTimeRange = (start, end) => `${start?.slice(0, 5) || ''} - ${end?.slice(0, 5) || ''}`;

  const calculateEventPosition = (event) => {
    if (!event || !event.Start_time || !event.End_time) return { top: '0%', height: '0%' };

    const [startHour, startMin] = event.Start_time.split(':').map(Number);
    const [endHour, endMin] = event.End_time.split(':').map(Number);
    const duration = (endHour - startHour) + (endMin - startMin) / 60;
    return { top: `${(startMin / 60) * 100}%`, height: `${duration * 100}%` };
  };

  const getRoomInfo = (schedule) => {
    const room = schedule?.Room
    return {
      code: room?.Code || '?',
      building: room?.Building || '?'
    };
  };

  const SectionScheduleEvent = ({ schedule }) => {
    const [hovered, setHovered] = useState(false);
    const pos = calculateEventPosition(schedule);

    const sectionsStr = schedule.Assignation &&
      schedule.Assignation.ProgYrSecs &&
      schedule.Assignation.ProgYrSecs.length > 0
      ? schedule.Assignation.ProgYrSecs
        .map(sec => `${sec.Program?.Code || 'Unknown'} ${sec.Year || '?'}-${sec.Section || '?'}`)
        .join(', ')
      : 'Unknown';

    const roomInfo = getRoomInfo(schedule);

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`absolute bg-blue-50 p-2 rounded-lg shadow-sm border border-blue-200 left-0 right-0 mx-1 transition-all text-blue-700 overflow-y-auto scrollbar-hide ${hovered ? 'z-[9999] scale-110' : 'z-10'}`}
        style={{ top: pos.top, height: hovered ? 'auto' : pos.height }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium">{formatTimeRange(schedule.Start_time, schedule.End_time)}</span>
          <span className="text-xs font-medium bg-blue-100 px-1 rounded">{sectionsStr}</span>
        </div>
        <div className="text-sm font-semibold">{schedule.Assignation?.Course?.Code || 'Unknown'}</div>
        <div className={`text-xs ${hovered ? '' : 'truncate'}`}>
          {schedule.Assignation?.Course?.Description || 'No description'}
        </div>
        <div className="text-xs">{schedule.Assignation?.Professor?.Name || 'Unknown'}</div>
        <div className="text-xs italic">
          Room: {roomInfo.code} - {roomInfo.building}
        </div>
      </div>
    );
  };

  const renderEvent = (hour, dayIndex) => {
    const apiDayIndex = dayIndex + 1;
    return filteredSchedules
      .filter(schedule => {
        if (!schedule || !schedule.Start_time || !schedule.End_time) return false;

        const [sHour, sMin] = schedule.Start_time.split(':').map(Number);
        const [eHour, eMin] = schedule.End_time.split(':').map(Number);
        return (
          schedule.Day === apiDayIndex &&
          sHour <= hour &&
          (eHour > hour || (eHour === hour && eMin > 0))
        );
      })
      .map(schedule => {
        if (!schedule.Start_time || parseInt(schedule.Start_time.split(':')[0]) !== hour) return null;
        return <SectionScheduleEvent key={schedule.id} schedule={schedule} />;
      });
  };

  const renderMobileEvent = (hour, dayIndex) => {
    if (dayIndex !== selectedDay) return null;
    return renderEvent(hour, selectedDay);
  };

  const getSelectedProgramCode = () => {
    const program = programs.find(p => p.id === selectedProgram);
    return program?.Code || 'Unknown';
  };

  // Handle school year change
  const handleSchoolYearChange = (e) => {
    const newSchoolYearId = e.target.value;
    setSelectedSchoolYear(newSchoolYearId);
    // Reset semester when school year changes
    setSelectedSemester(null);
    setSemesters([]);
  };

  const getSelectedSchoolYearName = () => {
    const schoolYear = schoolYears.find(sy => sy.id === selectedSchoolYear);
    return schoolYear?.SY_Name || 'Unknown';
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-gray-800"
    >
      <div className="fixed top-0 h-full z-50">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </div>
      <TopMenu toggleSidebar={toggleSidebar} />
      <div className="container mx-auto px-2 sm:px-4 pt-20 pb-10 flex-1 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full">
          {/* Header with filters */}
          <div className="bg-blue-600 p-4 sm:p-6">
            {/* Header section with title and selected info */}

            {/* Filters and export button */}
            <div className="flex flex-col md:flex-row md:items-end justify-end gap-4">
              <div className='flex flex-grow'>
                <div className="flex flex-col mb-4">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Section Timetable</h1>
                  {selectedSchoolYear && selectedSemester && selectedProgram && selectedYear && selectedSection && (
                    <div className="text-blue-100">
                      <p className="text-lg font-semibold">
                        {getSelectedProgramCode()} Year {selectedYear} Section {selectedSection} - SY: {getSelectedSchoolYearName()}, Sem: {selectedSemester}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter controls in a responsive row */}
              <div className="flex flex-wrap items-end gap-2 sm:gap-4">
                <button
                  onClick={() => navigate('/addConfigSchedule')}
                  className="bg-white text-blue-600 rounded-full p-3 mr-2 hover:bg-blue-200 duration-300 transition"
                  title="Go Back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* School Year Dropdown */}
                <div className="flex flex-col">
                  <label className="text-blue-100 text-sm mb-1">School Year</label>
                  <select
                    value={selectedSchoolYear || ''}
                    onChange={handleSchoolYearChange}
                    className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    disabled={loadingSchoolYears}
                  >
                    {loadingSchoolYears ? (
                      <option>Loading school years...</option>
                    ) : schoolYears.length > 0 ? (
                      schoolYears.map(sy => (
                        <option key={sy.id} value={sy.id}>
                          SY: {sy.SY_Name}
                        </option>
                      ))
                    ) : (
                      <option value="">No school years available</option>
                    )}
                  </select>
                </div>

                {/* Semester Dropdown */}
                <div className="flex flex-col">
                  <label className="text-blue-100 text-sm mb-1">Semester</label>
                  <select
                    value={selectedSemester || ''}
                    onChange={e => setSelectedSemester(e.target.value || null)}
                    className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    disabled={!selectedSchoolYear || semesters.length === 0}
                  >
                    {semesters.length > 0 ? (
                      semesters.map(semester => (
                        <option key={semester} value={semester}>Semester: {semester}</option>
                      ))
                    ) : (
                      <option value="">No semesters available</option>
                    )}
                  </select>
                </div>

                {/* Program Dropdown */}
                <div className="flex flex-col">
                  <label className="text-blue-100 text-sm mb-1">Program</label>
                  <select
                    value={selectedProgram || ''}
                    onChange={e => setSelectedProgram(e.target.value ? parseInt(e.target.value) : null)}
                    className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    disabled={!selectedSemester || programs.length === 0}
                  >
                    {programs.length > 0 ? (
                      programs.map(program => (
                        <option key={program.id} value={program.id}>
                          {program.Code || 'Unknown'}
                        </option>
                      ))
                    ) : (
                      <option value="">No programs available</option>
                    )}
                  </select>
                </div>

                {/* Year Dropdown */}
                <div className="flex flex-col">
                  <label className="text-blue-100 text-sm mb-1">Year</label>
                  <select
                    value={selectedYear || ''}
                    onChange={e => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                    className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    disabled={!selectedSemester || years.length === 0}
                  >
                    {years.length > 0 ? (
                      years.map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))
                    ) : (
                      <option value="">No years available</option>
                    )}
                  </select>
                </div>

                {/* Section Dropdown */}
                <div className="flex flex-col">
                  <label className="text-blue-100 text-sm mb-1">Section</label>
                  <select
                    value={selectedSection || ''}
                    onChange={e => setSelectedSection(e.target.value || null)}
                    className="rounded-lg px-3 py-1 sm:px-4 sm:py-2 bg-white text-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    disabled={!selectedSemester || sections.length === 0}
                  >
                    {sections.length > 0 ? (
                      sections.map(section => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))
                    ) : (
                      <option value="">No sections available</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Export button */}
              {selectedSchoolYear && selectedSemester && selectedProgram && selectedYear && selectedSection && !loading && filteredSchedules.length > 0 && (
                <div className="mt-2 md:mt-0">
                  <ExportButton
                    selectedSection={{
                      Program: getSelectedProgramCode(),
                      Year: selectedYear,
                      Section: selectedSection,
                      Semester: selectedSemester,
                      SchoolYear: getSelectedSchoolYearName()
                    }}
                    schedules={filteredSchedules}
                    days={days}
                    timeSlots={timeSlots}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="overflow-x-auto">
            <div className="p-2 sm:p-4">
              {/* Desktop View */}
              <div className="hidden md:block">
                {!selectedSchoolYear ? (
                  <div className="flex items-center justify-center py-16">
                    <span className="text-gray-500 font-medium">Please select a school year to view schedules</span>
                  </div>
                ) : !selectedSemester ? (
                  <div className="flex items-center justify-center py-16">
                    <span className="text-gray-500 font-medium">Please select a semester to view schedules</span>
                  </div>
                ) : loading ? (
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
                <div className="flex justify-between bg-gray-50 border-b-2 border-gray-200 p-2">
                  <span className="text-gray-700 font-medium text-sm">Time</span>
                  <div className="flex items-center gap-2">
                    {/* Add ExportButton in mobile view */}
                    {selectedSchoolYear && selectedSemester && selectedProgram && selectedYear && selectedSection && !loading && filteredSchedules.length > 0 && (
                      <ExportButton
                        selectedSection={{
                          Program: getSelectedProgramCode(),
                          Year: selectedYear,
                          Section: selectedSection,
                          Semester: selectedSemester,
                          SchoolYear: getSelectedSchoolYearName()
                        }}
                        schedules={filteredSchedules}
                        days={days}
                        timeSlots={timeSlots}
                      />
                    )}
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
                </div>
                {!selectedSchoolYear ? (
                  <div className="flex items-center justify-center py-10">
                    <span className="text-gray-500 font-medium text-sm">Please select a school year to view schedules</span>
                  </div>
                ) : !selectedSemester ? (
                  <div className="flex items-center justify-center py-10">
                    <span className="text-gray-500 font-medium text-sm">Please select a semester to view schedules</span>
                  </div>
                ) : loading ? (
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