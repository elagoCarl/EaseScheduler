import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const EditRoomModal = ({ room, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        Code: room.Code,
        Floor: room.Floor,
        Building: room.Building,
        Type: room.Type,
    })
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch statuses from the backend
    //   useEffect(() => {
    //     const fetchStatuses = async () => {
    //       try {
    //         const response = await axios.get('http://localhost:8080/profStatus/getAllProfStatus');
    //         console.log("Fetched data:", response.data);
    //         setStatuses(response.data.data);
    //       } catch (error) {
    //         console.error('Error fetching statuses:', error);
    //         setError('Failed to load teaching statuses.');
    //       }
    //     };

    //     fetchStatuses();
    //   }, [professor]); // Depend on professor to trigger the effect


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.Code || !formData.Building || !formData.Floor || !formData.Type) {
            setError('Please fill out all fields.');
            return;
        }

        try {
            setSuccessMessage('Updating room... Please wait.');
            setError('');
            setIsLoading(true);

            const response = await axios.put(
                `http://localhost:8080/room/updateRoom/${room.id}`,
                formData,
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            onUpdate(response.data);

            setSuccessMessage('Room updated successfully! Reloading page...');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            setError(error.response?.data?.message || 'An error occurred');
            setSuccessMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Edit Room</h2>
                </div>
                <form className="space-y-10 px-20" onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="Code">
                            Code
                        </label>
                        <input
                            type="text"
                            id="Code"
                            name="Code"
                            value={formData.Code}
                            onChange={handleChange}
                            className="w-full p-8 border rounded bg-customWhite"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="Floor">
                            Floor
                        </label>
                        <input
                            type="text"
                            id="Floor"
                            name="Floor"
                            value={formData.Floor}
                            onChange={handleChange}
                            className="w-full p-8 border rounded bg-customWhite"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="Building">
                            Campus
                        </label>
                        <select
                            id="Building"
                            name="Building"
                            value={formData.Building}
                            onChange={handleChange}
                            className="w-full p-8 border rounded bg-customWhite"
                        >
                            <option value="">Select a campus</option>
                            <option value="LV">LV</option>
                            <option value="GP">GP</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-white" htmlFor="Type">
                            Type
                        </label>
                        <select
                            id="Type"
                            name="Type"
                            value={formData.Type}
                            onChange={handleChange}
                            className="w-full p-8 border rounded bg-customWhite"
                        >
                            <option value="">Select a room type</option>
                            <option value="Lec">Lec</option>
                            <option value="Lab">Lab</option>
                        </select>
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg"

                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

EditRoomModal.propTypes = {
    professor: PropTypes.shape({
        Name: PropTypes.string.isRequired,
        Email: PropTypes.string.isRequired,
        StatusId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
};

export default EditRoomModal;
