import { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Clock, AlertCircle } from 'lucide-react';
import axios from '../../axiosConfig';

const ProfAvailabilityModal = ({ isOpen, onClose, professorId, professorName }) => {
    // States
    const [formData, setFormData] = useState({ day: "", timeIn: "", timeOut: "" });
    const [scheduleData, setScheduleData] = useState([]);
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingAvailability, setFetchingAvailability] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedAvailabilityId, setSelectedAvailabilityId] = useState(null);
    const [selectedDay, setSelectedDay] = useState(0);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
    const [collapseSchedule, setCollapseSchedule] = useState(false);

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hours = Array.from({ length: 15 }, (_, i) => 7 + i);
    const professorColors = ['bg-indigo-100', 'bg-blue-100', 'bg-purple-100', 'bg-emerald-100', 'bg-amber-100'];

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        if (professorId) {
            fetchProfessorAvailability();
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [professorId]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const fetchProfessorAvailability = async () => {
        if (!professorId) return;

        setFetchingAvailability(true);
        try {
            const response = await axios.get(`/profAvail/getProfAvailByProf/${professorId}`);
            if (response.data.successful) {
                setScheduleData([]);
                const availabilityData = response.data.data;
                if (availabilityData) {
                    const processedData = Array.isArray(availabilityData) ? availabilityData : [availabilityData];
                    const formattedAvailability = processedData.map(avail => ({
                        id: `existing-${avail.id}`,
                        professorId,
                        professorName,
                        day: avail.Day,
                        timeIn: avail.Start_time.split(':')[0],
                        timeOut: avail.End_time.split(':')[0],
                        isExisting: true
                    }));
                    setScheduleData(formattedAvailability);
                }
            }
        } catch (error) {
            if (!(error.response && error.response.status === 404)) {
                setNotification({ type: 'error', message: "Failed to load professor availability." });
            }
        } finally {
            setFetchingAvailability(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (notification) setNotification(null);
    };

    const resetForm = () => setFormData({ day: "", timeIn: "", timeOut: "" });

    const validateForm = () => {
        const { day, timeIn, timeOut } = formData;
        if (!day || !timeIn || !timeOut) {
            setNotification({ type: 'error', message: "Please fill all fields" });
            return false;
        }

        const startHour = parseInt(timeIn);
        const endHour = parseInt(timeOut);
        if (startHour >= endHour) {
            setNotification({ type: 'error', message: "End time must be after start time" });
            return false;
        }

        const conflict = scheduleData.some(slot =>
            slot.day === day &&
            ((parseInt(slot.timeIn) <= startHour && parseInt(slot.timeOut) > startHour) ||
                (parseInt(slot.timeIn) < endHour && parseInt(slot.timeOut) >= endHour) ||
                (startHour <= parseInt(slot.timeIn) && endHour >= parseInt(slot.timeOut)))
        );

        if (conflict) {
            setNotification({ type: 'error', message: "Time slot conflicts with existing schedule" });
            return false;
        }
        return true;
    };

    const handleAdd = async () => {
        if (!validateForm()) return;

        try {
            const startHour = parseInt(formData.timeIn);
            const endHour = parseInt(formData.timeOut);
            const availabilityData = {
                ProfessorId: parseInt(professorId),
                Day: formData.day,
                Start_time: `${startHour.toString().padStart(2, '0')}:00:00`,
                End_time: `${endHour.toString().padStart(2, '0')}:00:00`
            };

            setLoading(true);
            const response = await axios.post(`/profAvail/addProfAvail`, availabilityData);

            if (response.data.successful) {
                let newId = response.data.data?.id ? `existing-${response.data.data.id}` :
                    (response.data.id ? `existing-${response.data.id}` :
                        (typeof response.data.data === 'number' ? `existing-${response.data.data}` : `existing-temp-${Date.now()}`));

                setScheduleData([...scheduleData, {
                    id: newId,
                    professorId,
                    professorName,
                    day: formData.day,
                    timeIn: startHour.toString(),
                    timeOut: endHour.toString(),
                    isExisting: true
                }]);
                setNotification({ type: 'success', message: "Availability added successfully!" });
                resetForm();
            } else {
                setNotification({ type: 'error', message: `Failed to add: ${response.data.message || "Unknown error"}` });
            }
        } catch (error) {
            setNotification({ type: 'error', message: error.response?.data?.message || "Failed to add availability." });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setSelectedAvailabilityId(id.split('-')[1]);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedAvailabilityId) return;

        try {
            setLoading(true);
            await axios.delete(`/profAvail/deleteProfAvail/${selectedAvailabilityId}`);
            setNotification({ type: 'success', message: "Availability deleted successfully!" });
            fetchProfessorAvailability(); // Refresh data after deletion
        } catch (error) {
            setNotification({ type: 'error', message: error.response?.data?.message || "Failed to delete availability." });
        } finally {
            setLoading(false);
            setIsDeleteConfirmOpen(false);
            setSelectedAvailabilityId(null);
        }
    };

    const getScheduleForCell = (day, hour) => {
        return scheduleData.filter(schedule =>
            schedule.day === day &&
            parseInt(schedule.timeIn) <= hour &&
            parseInt(schedule.timeOut) > hour
        );
    };

    const getProfessorColor = (day) => {
        const dayIndex = days.indexOf(day);
        return professorColors[dayIndex % professorColors.length];
    };

    const formatTimeRange = (start, end) => `${start}:00 - ${end}:00`;

    const ScheduleEvent = ({ schedule, day, hour }) => {
        const [hovered, setHovered] = useState(false);
        const isStartHour = parseInt(schedule.timeIn) === hour;
        if (!isStartHour) return null;
        const duration = parseInt(schedule.timeOut) - parseInt(schedule.timeIn);

        return (
            <div
                onClick={() => handleDeleteClick(schedule.id)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`absolute ${getProfessorColor(day)} p-2 rounded-lg shadow-sm border border-gray-200 left-0 right-0 mx-1 transition-all cursor-pointer hover:shadow-md ${hovered ? 'z-50 scale-105' : 'z-10'}`}
                style={{
                    top: '0',
                    height: `${duration * 100}%`,
                    maxHeight: `${duration * 100}%`
                }}
                title="Click to delete this availability"
            >
                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{formatTimeRange(schedule.timeIn, schedule.timeOut)}</span>
                </div>
            </div>
        );
    };

    const renderMobileSchedule = (event) => (
        <div key={event.id} className="mb-3 relative cursor-pointer" onClick={() => handleDeleteClick(event.id)}>
            <div className={`${getProfessorColor(event.day)} text-xs p-2 m-1 rounded shadow-sm hover:shadow transition-all`}>
                <div className="flex justify-between items-center">
                    <div className="font-medium text-gray-800">{event.day}</div>
                </div>
                <div className="text-gray-700">{formatTimeRange(event.timeIn, event.timeOut)}</div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-indigo-700 to-violet-600 p-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Professor Availability</h2>
                        <p className="text-indigo-200 text-sm">{professorName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 bg-white bg-opacity-20 text-white rounded-full hover:bg-opacity-30 transition-all">
                        <X size={16} />
                    </button>
                </div>

                {/* Notification */}
                {notification && (
                    <div className={`mx-4 my-2 p-3 rounded-md text-sm font-medium flex items-center gap-2 ${notification.type === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        }`}>
                        <AlertCircle size={16} />
                        {notification.message}
                    </div>
                )}

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Left Panel - Form */}
                    <div className="md:w-1/3 p-4 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="day" className="block text-sm font-medium mb-1 text-gray-700">Day:</label>
                                <select
                                    id="day"
                                    name="day"
                                    value={formData.day}
                                    onChange={handleInputChange}
                                    className="w-full p-2 text-sm border rounded-md shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Select Day</option>
                                    {days.map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="timeIn" className="block text-sm font-medium mb-1 text-gray-700">Start Time:</label>
                                    <select
                                        id="timeIn"
                                        name="timeIn"
                                        value={formData.timeIn}
                                        onChange={handleInputChange}
                                        className="w-full p-2 text-sm border rounded-md shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select Time</option>
                                        {hours.map(hour => <option key={hour} value={hour}>{hour}:00</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="timeOut" className="block text-sm font-medium mb-1 text-gray-700">End Time:</label>
                                    <select
                                        id="timeOut"
                                        name="timeOut"
                                        value={formData.timeOut}
                                        onChange={handleInputChange}
                                        className="w-full p-2 text-sm border rounded-md shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select Time</option>
                                        {hours.map(hour => <option key={hour + 1} value={hour + 1}>{hour + 1}:00</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex pt-2 gap-2">
                                <button
                                    onClick={resetForm}
                                    className="flex-1 bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2 text-sm rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={loading || fetchingAvailability || !formData.day || !formData.timeIn || !formData.timeOut}
                                    className={`flex-1 flex justify-center items-center gap-1 ${loading || fetchingAvailability || !formData.day || !formData.timeIn || !formData.timeOut
                                        ? 'bg-indigo-300 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                                        } text-white px-4 py-2 text-sm rounded-md transition-colors`}
                                >
                                    {loading ? 'Adding...' : 'Add Availability'}
                                </button>
                            </div>

                            <div className="pt-3 text-xs text-gray-500 italic flex items-center gap-1">
                                <Clock size={12} />
                                Click on any availability slot to delete it
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Schedule */}
                    <div className="md:w-2/3 flex flex-col flex-1 overflow-hidden">
                        <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-800">Availability Schedule</h3>
                            <button
                                className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-600 p-1 rounded"
                                onClick={() => setCollapseSchedule(!collapseSchedule)}
                            >
                                {collapseSchedule ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                {collapseSchedule ? 'Expand' : 'Collapse'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-2">
                            {fetchingAvailability ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">Loading availability data...</p>
                                </div>
                            ) : scheduleData.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center p-6">
                                        <p className="text-gray-500 mb-2">No availability schedules set</p>
                                        <p className="text-xs text-gray-400">Use the form to add professor availability</p>
                                    </div>
                                </div>
                            ) : isMobileView || collapseSchedule ? (
                                <div className="grid grid-cols-1 gap-1">
                                    {days.map(day => {
                                        const dayEvents = scheduleData.filter(event => event.day === day);
                                        if (dayEvents.length === 0) return null;

                                        return (
                                            <div key={day} className="mb-4">
                                                <h4 className="text-xs font-medium text-gray-700 mb-1 px-1">{day}</h4>
                                                {dayEvents.map(event => renderMobileSchedule(event))}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="min-w-full overflow-x-auto">
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
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-80">
                        <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete this availability time slot?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfAvailabilityModal;