import { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Clock, AlertCircle, Calendar, ArrowLeftRight, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
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
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
    const [collapseSchedule, setCollapseSchedule] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hours = Array.from({ length: 15 }, (_, i) => 7 + i);

    // Color mapping to match the main interface's color scheme
    const dayColorMap = {
        "Monday": "bg-blue-100 border-blue-200 text-blue-800",
        "Tuesday": "bg-emerald-100 border-emerald-200 text-emerald-800",
        "Wednesday": "bg-indigo-100 border-indigo-200 text-indigo-800",
        "Thursday": "bg-amber-100 border-amber-200 text-amber-800",
        "Friday": "bg-purple-100 border-purple-200 text-purple-800",
        "Saturday": "bg-rose-100 border-rose-200 text-rose-800"
    };

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

    const getDayColor = (day) => {
        return dayColorMap[day] || "bg-gray-100 border-gray-200 text-gray-800";
    };

    const formatTimeRange = (start, end) => `${start}:00 - ${end}:00`;

    const ScheduleEvent = ({ schedule, day, hour }) => {
        const [hovered, setHovered] = useState(false);
        const isStartHour = parseInt(schedule.timeIn) === hour;
        if (!isStartHour) return null;
        const duration = parseInt(schedule.timeOut) - parseInt(schedule.timeIn);
        const colorClass = getDayColor(day);

        return (
            <div
                onClick={() => handleDeleteClick(schedule.id)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`absolute ${colorClass} p-2 rounded-md shadow-sm border left-0 right-0 mx-1 transition-all cursor-pointer hover:shadow-md ${hovered ? 'z-50 scale-105' : 'z-10'}`}
                style={{
                    top: '0',
                    height: `${duration * 100}%`,
                    maxHeight: `${duration * 100}%`
                }}
                title="Click to delete this availability"
            >
                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{formatTimeRange(schedule.timeIn, schedule.timeOut)}</span>
                    {hovered && <Trash2 size={12} className="text-gray-600" />}
                </div>
            </div>
        );
    };

    const renderListItem = (event) => (
        <div key={event.id} className="mb-3 relative cursor-pointer group" onClick={() => handleDeleteClick(event.id)}>
            <div className={`${getDayColor(event.day)} p-3 rounded-md shadow-sm hover:shadow transition-all border`}>
                <div className="flex justify-between items-center">
                    <div className="font-medium">{event.day}</div>
                    <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{formatTimeRange(event.timeIn, event.timeOut)}</span>
                    </div>
                    <button className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition duration-150 opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="bg-blue-600 p-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Calendar size={20} />
                            Professor Availability
                        </h2>
                        <p className="text-blue-100 text-sm mt-1">{professorName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30 transition duration-200">
                        <X size={18} />
                    </button>
                </div>

                {/* Notification */}
                {notification && (
                    <div className={`mx-4 my-2 p-3 rounded-md text-sm font-medium flex items-center gap-2 ${notification.type === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                        <AlertCircle size={16} />
                        {notification.message}
                    </div>
                )}

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Left Panel - Form */}
                    <div className="md:w-1/3 p-4 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">
                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-800 mb-2">Add New Availability</h3>

                            <div>
                                <label htmlFor="day" className="block text-sm font-medium mb-1 text-gray-700">Day:</label>
                                <select
                                    id="day"
                                    name="day"
                                    value={formData.day}
                                    onChange={handleInputChange}
                                    className="w-full p-2.5 text-sm border rounded shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        className="w-full p-2.5 text-sm border rounded shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        className="w-full p-2.5 text-sm border rounded shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Time</option>
                                        {hours.map(hour => <option key={hour + 1} value={hour + 1}>{hour + 1}:00</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex pt-2 gap-2">
                                <button
                                    onClick={resetForm}
                                    className="flex-1 bg-white text-gray-700 border border-gray-300 px-4 py-2.5 text-sm rounded hover:bg-gray-50 transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={loading || fetchingAvailability || !formData.day || !formData.timeIn || !formData.timeOut}
                                    className={`flex-1 flex justify-center items-center gap-2 ${loading || fetchingAvailability || !formData.day || !formData.timeIn || !formData.timeOut
                                        ? 'bg-blue-300 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                        } text-white px-4 py-2.5 text-sm rounded shadow-sm transition-colors`}
                                >
                                    <Plus size={16} />
                                    {loading ? 'Adding...' : 'Add Availability'}
                                </button>
                            </div>

                            <div className="pt-3 text-xs text-gray-500 border-t border-gray-200 mt-4 pt-4 flex items-center gap-2">
                                <AlertCircle size={14} className="text-blue-500" />
                                <span>Click on any availability slot to delete it</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Schedule */}
                    <div className="md:w-2/3 flex flex-col flex-1 overflow-hidden">
                        <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-medium text-gray-800 flex items-center gap-2">
                                <Calendar size={16} className="text-blue-600" />
                                Availability Schedule
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    className={`px-2 py-1 rounded text-xs font-medium transition duration-200 flex items-center gap-1 
                                    ${viewMode === 'grid'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    onClick={() => setViewMode('grid')}
                                >
                                    Grid View
                                </button>
                                <button
                                    className={`px-2 py-1 rounded text-xs font-medium transition duration-200 flex items-center gap-1 
                                    ${viewMode === 'list'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    List View
                                </button>
                                {viewMode === 'grid' && (
                                    <button
                                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 p-1 rounded ml-2"
                                        onClick={() => setCollapseSchedule(!collapseSchedule)}
                                    >
                                        {collapseSchedule ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                        {collapseSchedule ? 'Expand' : 'Collapse'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            {fetchingAvailability ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">Loading availability data...</p>
                                </div>
                            ) : scheduleData.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200 w-full max-w-md">
                                        <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-600 font-medium mb-2">No availability schedules set</p>
                                        <p className="text-sm text-gray-500">Use the form to add professor availability</p>
                                    </div>
                                </div>
                            ) : viewMode === 'list' ? (
                                <div className="space-y-2">
                                    {days.map(day => {
                                        const dayEvents = scheduleData.filter(event => event.day === day);
                                        if (dayEvents.length === 0) return null;

                                        return (
                                            <div key={day} className="mb-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2 px-1 flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${getDayColor(day).split(' ')[0]}`}></div>
                                                    {day}
                                                </h4>
                                                {dayEvents.map(event => renderListItem(event))}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : isMobileView || collapseSchedule ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {days.map(day => {
                                        const dayEvents = scheduleData.filter(event => event.day === day);
                                        if (dayEvents.length === 0) return null;

                                        return (
                                            <div key={day} className="mb-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2 px-1 flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${getDayColor(day).split(' ')[0]}`}></div>
                                                    {day}
                                                </h4>
                                                <div className="space-y-2">
                                                    {dayEvents.map(event => (
                                                        <div
                                                            key={event.id}
                                                            className="relative cursor-pointer group p-3 rounded-md shadow-sm hover:shadow transition-all border flex justify-between items-center"
                                                            onClick={() => handleDeleteClick(event.id)}
                                                        >
                                                            <div className={getDayColor(day)}>
                                                                <div className="flex items-center gap-2">
                                                                    <Clock size={14} />
                                                                    <span>{formatTimeRange(event.timeIn, event.timeOut)}</span>
                                                                </div>
                                                            </div>
                                                            <button className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded transition duration-150 opacity-0 group-hover:opacity-100">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
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

            {/* Updated Delete Confirmation Dialog with Framer Motion */}
            {isDeleteConfirmOpen && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                    >
                        <div className="flex flex-col gap-4">
                            <div className="text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                    <AlertCircle size={24} className="text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2 text-gray-800">Confirm Deletion</h3>
                                <p className="text-gray-600 text-sm">Are you sure you want to delete this availability time slot?</p>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setIsDeleteConfirmOpen(false)}
                                    disabled={loading}
                                    className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={loading}
                                    className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Deleting...' : 'Delete'}
                                    {!loading && <Trash2 size={14} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default ProfAvailabilityModal;