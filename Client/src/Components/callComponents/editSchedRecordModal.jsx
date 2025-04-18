import { useState, useEffect } from "react";
import axios from "../../axiosConfig";
import { useAuth } from '../authContext';

const EditSchedRecordModal = ({ isOpen, schedule, onClose, onUpdate, rooms, assignations }) => {

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const [formData, setFormData] = useState({
        assignation_id: "",
        room_id: "",
        day: "",
        start_time: "",
        end_time: ""
    });
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [availableSections, setAvailableSections] = useState([]);
    const [selectedSections, setSelectedSections] = useState([]);
    const deptId = user.DepartmentId

    // Helper function to transform error messages
    const transformErrorMessage = (message) => {
        if (!message) return message;
        let newMessage = message;
        newMessage = newMessage.replace(/Room\s+(\d+)\b/, (match, roomId) => {
            const room = rooms.find(r => r.id.toString() === roomId);
            return room && room.Code ? `Room ${room.Code}` : match;
        });
        newMessage = newMessage.replace(/on\s+(\d+)\b/, (match, dayNum) => {
            const dayIndex = parseInt(dayNum, 10) - 1;
            return days[dayIndex] ? `on ${days[dayIndex]}` : match;
        });
        return newMessage;
    };

    // Fetch sections for a course
    const fetchSectionsForCourse = async (courseId) => {
        try {
            const response = await axios.post('/progYrSec/getProgYrSecByCourse', {
                CourseId: courseId,
                DepartmentId: deptId
            });

            if (response.data.successful) {
                setAvailableSections(response.data.data);
            } else {
                setAvailableSections([]);
            }
        } catch (err) {
            console.error("Error fetching sections:", err);
            setAvailableSections([]);
        }
    };

    // Fetch currently assigned sections
    useEffect(() => {
        // Only proceed if we have both schedule data with ProgYrSecs and available sections
        if (schedule?.ProgYrSecs && availableSections.length > 0) {
            // Match existing ProgYrSecs with available sections
            const matchedSectionIds = availableSections.filter(available => 
                schedule.ProgYrSecs.some(section => 
                    section.Program?.Code === available.Program?.Code &&
                    section.Year === available.Year &&
                    section.Section === available.Section
                )
            ).map(s => s.id);
            
            setSelectedSections(matchedSectionIds);
        }
    }, [availableSections, schedule]);

    // Populate form data when the schedule prop changes, trimming seconds if necessary.
    useEffect(() => {
        if (schedule) {
            setFormData({
                assignation_id: schedule.AssignationId || "",
                room_id: schedule.RoomId || "",
                day: schedule.Day || "",
                start_time: schedule.Start_time ? schedule.Start_time.slice(0, 5) : "",
                end_time: schedule.End_time ? schedule.End_time.slice(0, 5) : ""
            });

            // Fetch course sections when a schedule is selected
            if (schedule.AssignationId) {
                const selectedAssignation = assignations.find(a => a.id === schedule.AssignationId);
                if (selectedAssignation?.CourseId) {
                    fetchSectionsForCourse(selectedAssignation.CourseId);
                }
            }
        }
    }, [schedule, assignations]);

    // Update selected sections when available sections change
    useEffect(() => {
        if (schedule && schedule.id && availableSections.length > 0) {
            // Match ProgYrSecs with available sections
            if (schedule.ProgYrSecs && schedule.ProgYrSecs.length > 0) {
                const matchedSectionIds = availableSections.filter(available =>
                    schedule.ProgYrSecs.some(section =>
                        section.Program?.Code === available.Program?.Code &&
                        section.Year === available.Year &&
                        section.Section === available.Section
                    )
                ).map(s => s.id);

                setSelectedSections(matchedSectionIds);
            }
        }
    }, [availableSections, schedule]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // If assignation changes, fetch sections for the selected course
        if (name === "assignation_id" && value) {
            const selectedAssignation = assignations.find(a => a.id === parseInt(value));
            if (selectedAssignation?.CourseId) {
                fetchSectionsForCourse(selectedAssignation.CourseId);
                setSelectedSections([]); // Reset section selection when assignation changes
            }
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (selectedSections.length === 0) {
            setError("Please select at least one section.");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                Day: parseInt(formData.day),
                Start_time: formData.start_time,
                End_time: formData.end_time,
                RoomId: parseInt(formData.room_id),
                AssignationId: parseInt(formData.assignation_id),
                Sections: selectedSections // Include selected sections in payload
            };

            const response = await axios.put(`/schedule/updateSchedule/${schedule.id}`, payload);

            if (response.data.successful) {
                // Fetch the updated schedule to get the complete data with sections
                const updatedResponse = await axios.get(`/schedule/getSchedule/${schedule.id}`);
                if (updatedResponse.data.successful) {
                    onUpdate(updatedResponse.data.data);
                    onClose();
                } else {
                    // Fall back to updating with the original payload if fetch fails
                    const updatedSchedule = { ...schedule, ...payload };
                    onUpdate(updatedSchedule);
                    onClose();
                }
            } else {
                setError(transformErrorMessage(response.data.message || "Failed to update schedule."));
            }
        } catch (err) {
            console.error("Error updating schedule:", err);
            setError(transformErrorMessage(err.response?.data?.message || err.message || "An error occurred."));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6">
                <h2 className="text-xl font-semibold mb-4">Edit Schedule Record</h2>
                {error && (
                    <div className="mb-4 text-sm text-red-600">
                        {typeof error === "object" ? JSON.stringify(error) : error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Room Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Room</label>
                        <select
                            name="room_id"
                            value={formData.room_id}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="">Select Room</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    {room.Code} - {room.Building} {room.Floor} (Type: {room.Type})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Assignation Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Assignation</label>
                        <select
                            name="assignation_id"
                            value={formData.assignation_id}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="">Select Assignation</option>
                            {assignations.map(assign => (
                                <option key={assign.id} value={assign.id}>
                                    {assign.Course?.Code} - {assign.Course?.Description} ({assign.Course?.Units} units) | {assign.Professor?.Name} - Total: {assign.Professor?.Total_units} units | Dept: {assign.Department?.Name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sections Selection */}
                    {formData.assignation_id && availableSections.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sections</label>
                            <div className="mt-1 p-2 border border-gray-300 rounded-md">
                                <div className="grid grid-cols-3 gap-1">
                                {availableSections.map(section => (
                                    <div key={section.id} className="flex items-center mb-1">
                                        <input
                                            type="checkbox"
                                            id={`section-${section.id}`}
                                            value={section.id}
                                            checked={selectedSections.includes(section.id)}
                                            onChange={handleSectionChange}
                                            className="h-auto w-auto text-blue-600 border-gray-300 rounded"
                                        />
                                        <label htmlFor={`section-${section.id}`} className="ml-2 text-sm text-gray-700">
                                            {section.Program?.Code} {section.Year}-{section.Section}
                                        </label>
                                    </div>
                                ))}
                                </div>
                            </div>
                            {availableSections.length > 0 && (
                                <div className="flex justify-end mt-1 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSections(availableSections.map(s => s.id))}
                                        className="text-blue-600 hover:text-blue-800 mr-2"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSections([])}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Day Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Day</label>
                        <select
                            name="day"
                            value={formData.day}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="">Select Day</option>
                            {days.map((day, index) => (
                                <option key={index} value={index + 1}>
                                    {day}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Time Inputs */}
                    <div className="flex space-x-4">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700">Start Time</label>
                            <input
                                type="time"
                                name="start_time"
                                value={formData.start_time}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700">End Time</label>
                            <input
                                type="time"
                                name="end_time"
                                value={formData.end_time}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md text-gray-700 bg-gray-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md text-white bg-blue-600"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSchedRecordModal;