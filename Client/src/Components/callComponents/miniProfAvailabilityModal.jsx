import { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
//para to sa add config schedule
const ProfAvailabilityModal = ({ isOpen, onClose, professorId }) => {
    const [scheduleData, setScheduleData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
    const [selectedDay, setSelectedDay] = useState(0);
    const [professorName, setProfessorName] = useState("");

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hours = Array.from({ length: 15 }, (_, i) => 7 + i);
    const professorColors = ['bg-blue-300', 'bg-green-300', 'bg-purple-300', 'bg-yellow-300', 'bg-red-300'];

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isOpen && professorId) {
            fetchProfessorAvailability();
            fetchProfessorName();
        } else {
            setScheduleData([]);
            setProfessorName("");
        }
    }, [isOpen, professorId]);

    const fetchProfessorName = async () => {
        if (!professorId) return;

        try {
            const response = await axios.get(`/prof/getProf/${professorId}`);
            if (response.data.successful) {
                setProfessorName(response.data.data.Name);
            }
        } catch (error) {
            console.error("Error fetching professor name:", error);
        }
    };

    const fetchProfessorAvailability = async () => {
        if (!professorId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`/profAvail/getProfAvailByProf/${professorId}`);
            if (response.data.successful) {
                const availabilityData = response.data.data;
                if (availabilityData) {
                    const processedData = Array.isArray(availabilityData) ? availabilityData : [availabilityData];
                    const formattedAvailability = processedData.map(avail => ({
                        id: `existing-${avail.id}`,
                        professorId: professorId,
                        day: avail.Day,
                        timeIn: avail.Start_time.split(':')[0],
                        timeOut: avail.End_time.split(':')[0]
                    }));
                    setScheduleData(formattedAvailability);
                } else {
                    setScheduleData([]);
                }
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                setScheduleData([]);
            } else {
                setError("Failed to load professor availability.");
            }
        } finally {
            setLoading(false);
        }
    };

    const getScheduleForCell = (day, hour) => {
        return scheduleData.filter(schedule =>
            schedule.day === day &&
            parseInt(schedule.timeIn) <= hour &&
            parseInt(schedule.timeOut) > hour
        );
    };

    const getProfessorColor = (profId) => {
        const index = (parseInt(profId) - 1) % professorColors.length;
        return professorColors[index];
    };

    const formatTimeRange = (start, end) => `${start}:00 - ${end}:00`;

    const ScheduleEvent = ({ schedule, day, hour }) => {
        const isStartHour = parseInt(schedule.timeIn) === hour;
        if (!isStartHour) return null;
        const duration = parseInt(schedule.timeOut) - parseInt(schedule.timeIn);

        return (
            <div
                className={`absolute ${getProfessorColor(schedule.professorId)} p-1 rounded-lg shadow-sm border border-gray-200 left-0 right-0 mx-1 mb-1`}
                style={{
                    top: '0',
                    height: `${duration * 100}%`,
                    maxHeight: `${duration * 100}%`
                }}
            >
                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{formatTimeRange(schedule.timeIn, schedule.timeOut)}</span>
                </div>
            </div>
        );
    };

    const renderMobileSchedule = (event) => (
        <div key={event.id} className="mb-2 relative">
            <div className={`${getProfessorColor(event.professorId)} text-xs p-2 m-1 rounded shadow`}>
                <div className="flex justify-between items-center">
                    <div className="font-bold">{days.find(d => d === event.day)}</div>
                </div>
                <div>{formatTimeRange(event.timeIn, event.timeOut)}</div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-800 bg-opacity-50 backdrop-blur-sm flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl m-4">
                <div className="bg-blue-600 p-12 flex justify-between items-center rounded">
                    <h2 className="text-lg font-bold text-white">
                        {professorName ? `${professorName}'s Availability` : 'Professor Availability'}
                    </h2>
                    <button onClick={onClose} className="text-white hover:text-gray-300 duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="mx-4 my-4 p-3 rounded-lg text-sm font-medium border bg-red-100 text-red-700 border-red-300">
                        {error}
                    </div>
                )}

                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center items-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : scheduleData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No availability schedules found for this professor</div>
                    ) : isMobileView ? (
                        <>
                            <div className="flex justify-between items-center bg-gray-50 border-b-2 border-gray-200 p-2 sticky top-0 z-10">
                                <span className="text-gray-700 font-medium text-xs sm:text-sm">Availability Schedule</span>
                                <select
                                    className="rounded-lg px-2 py-1 text-xs bg-white border border-gray-200"
                                    value={selectedDay}
                                    onChange={e => setSelectedDay(parseInt(e.target.value, 10))}
                                >
                                    {days.map((d, idx) => (
                                        <option key={d} value={idx}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="p-2">
                                {scheduleData
                                    .filter(event => event.day === days[selectedDay])
                                    .length ? (
                                    scheduleData
                                        .filter(event => event.day === days[selectedDay])
                                        .map(event => renderMobileSchedule(event))
                                ) : (
                                    <div className="text-center py-6 text-gray-500">No availability for this day</div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-2 border-b-2 border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs text-left w-16">Time</th>
                                        {days.map(d => (
                                            <th key={d} className="p-2 border-b-2 text-center border-gray-200 bg-gray-50 text-gray-700 font-medium text-xs">{d}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {hours.map(hour => (
                                        <tr key={hour} className="hover:bg-gray-50">
                                            <td className="p-2 border-b border-gray-200 text-gray-700 font-medium text-xs w-16">{`${hour.toString().padStart(2, '0')}:00`}</td>
                                            {days.map((day) => (
                                                <td key={day} className="p-0 border-b border-gray-200 relative h-12">
                                                    {getScheduleForCell(day, hour).map(schedule => (
                                                        <ScheduleEvent key={`${schedule.id}-${hour}`} schedule={schedule} day={day} hour={hour} />
                                                    ))}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 duration-300 text-white px-8 py-4 mb-4 mt-2 text-sm rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfAvailabilityModal;