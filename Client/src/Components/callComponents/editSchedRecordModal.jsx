import { useState, useEffect } from "react";
import axios from "../../axiosConfig";
import { useAuth } from '../authContext';

const EditSchedRecordModal = ({ isOpen, schedule, onClose, onUpdate, rooms, assignations, Semester, SchoolYearId }) => {
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
    const deptId = user.DepartmentId;
    const [isDepartmentMatch, setIsDepartmentMatch] = useState(true);
    
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

    useEffect(() => {
        if (schedule) {
            setFormData({
                assignation_id: schedule.AssignationId || "",
                room_id: schedule.RoomId || "",
                day: schedule.Day || "",
                start_time: schedule.Start_time ? schedule.Start_time.slice(0, 5) : "",
                end_time: schedule.End_time ? schedule.End_time.slice(0, 5) : ""
            });

            const isMatch = schedule.Assignation?.DepartmentId === deptId;
            setIsDepartmentMatch(isMatch);
        }
    }, [schedule, deptId]);

    const handleInputChange = (e) => {
        if (!isDepartmentMatch && e.target.name !== "sections") {
            return;
        }

        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Simplified payload to match your backend expectations
            const payload = {
                Day: parseInt(formData.day),
                Start_time: formData.start_time,
                End_time: formData.end_time,
                RoomId: parseInt(formData.room_id),
                AssignationId: parseInt(formData.assignation_id)
            };

            // Basic validation for required fields
            if (!payload.Day || !payload.Start_time || !payload.End_time ||
                !payload.RoomId || !payload.AssignationId) {
                setError("Please fill in all fields.");
                setTimeout(() => {
                    setError(null);
                }, 8000);
                setLoading(false);
                return;
            }

            // Special case for different department - keep the original data
            if (!isDepartmentMatch) {
                payload.Day = schedule.Day;
                payload.Start_time = schedule.Start_time.slice(0, 5);
                payload.End_time = schedule.End_time.slice(0, 5);
                payload.RoomId = schedule.RoomId;
                payload.AssignationId = schedule.AssignationId;
            }

            const response = await axios.put(`/schedule/updateSchedule/${schedule.id}`, payload);

            if (response.data.successful) {
                const updatedResponse = await axios.get(`/schedule/getSchedule/${schedule.id}`);
                if (updatedResponse.data.successful) {
                    onUpdate(updatedResponse.data.data);
                    onClose();
                } else {
                    const updatedSchedule = { ...schedule, ...payload };
                    onUpdate(updatedSchedule);
                    onClose();
                }
            } else {
                setError(transformErrorMessage(response.data.message || "Failed to update schedule."));
                setTimeout(() => {
                    setError(null);
                }, 8000);
            }
        } catch (err) {
            console.error("Error updating schedule:", err);
            setError(transformErrorMessage(err.response?.data?.message || err.message || "An error occurred."));
            setTimeout(() => {
                setError(null);
            }, 8000);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-10">
                <h2 className="text-xl font-semibold mb-4">Edit Schedule Record</h2>
                {!isDepartmentMatch && schedule?.Assignation && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <p className="text-sm font-medium text-gray-700">Different Department Schedule:</p>
                        <p className="text-sm">
                            <span className="font-medium">Course:</span> {schedule.Assignation.Course?.Code} - {schedule.Assignation.Course?.Description}
                        </p>
                        <p className="text-sm">
                            <span className="font-medium">Professor:</span> {schedule.Assignation.Professor?.Name}
                        </p>
                        <p className="text-sm">
                            <span className="font-medium">Day:</span> {days[schedule.Day - 1]}
                        </p>
                        <p className="text-sm">
                            <span className="font-medium">Time:</span> {schedule.Start_time?.slice(0, 5)} - {schedule.End_time?.slice(0, 5)}
                        </p>
                    </div>
                )}

                {!isDepartmentMatch && (
                    <div className="mb-4 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                        This schedule belongs to a different department. You cannot edit it.
                    </div>
                )}

                {error && (
                    <div className="mb-4 text-sm text-red-600">
                        {typeof error === "object" ? JSON.stringify(error) : error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Room Dropdown - Only if same department */}
                    {isDepartmentMatch && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Room</label>
                            <select
                                name="room_id"
                                value={formData.room_id}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                disabled
                            >
                                <option value="">Select Room</option>
                                {rooms.map(room => (
                                    <option key={room.id} value={room.id}>
                                        {room.Code} - {room.Building} {room.Floor} (Type: {room.TypeRooms?.map(item => item.Type).join(', ')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Assignation Dropdown - Only if same department */}
                    {isDepartmentMatch && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Assignation</label>
                            <select
                                name="assignation_id"
                                value={formData.assignation_id}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                disabled
                            >
                                <option value="">Select Assignation</option>
                                {assignations.map(assign => {
                                    // Display sections for this assignation if available
                                    const sectionsString = assign.ProgYrSecs && assign.ProgYrSecs.length > 0
                                        ? assign.ProgYrSecs
                                            .filter(sec => sec && sec.Program)
                                            .map(sec => `${sec.Program.Code} ${sec.Year}-${sec.Section}`)
                                            .join(', ')
                                        : 'No sections';
                                        
                                    return (
                                        <option key={assign.id} value={assign.id}>
                                            {assign.Course?.Code} - {assign.Course?.Description} | {assign.Professor?.Name} | {sectionsString}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* Day Dropdown - Only if same department */}
                    {isDepartmentMatch && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Day</label>
                            <select
                                name="day"
                                value={formData.day}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                required
                            >
                                <option value="">Select Day</option>
                                {days.map((day, index) => (
                                    <option key={index} value={index + 1}>
                                        {day}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Time Inputs - Only if same department */}
                    {isDepartmentMatch && (
                        <div className="flex space-x-4">
                            <div className="w-1/2">
                                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                                <input
                                    type="time"
                                    name="start_time"
                                    value={formData.start_time}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                    required
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
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md text-gray-800 bg-gray-300/80 hover:bg-gray-400 duration-300"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-10 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-700 duration-300"
                            disabled={loading || !isDepartmentMatch}
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