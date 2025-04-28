const { Room, Department, RoomType } = require('../models')
const jwt = require('jsonwebtoken')
const { REFRESH_TOKEN_SECRET } = process.env
const util = require('../../utils')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const addRoom = async (req, res, next) => {
    try {
        let rooms = req.body;

        // Check if the request body contains an array of rooms
        if (!Array.isArray(rooms)) {
            // If not an array, convert the single room to an array
            rooms = [rooms];
        }

        for (const room of rooms) {
            const { Code, Floor, Building, Type, NumberOfSeats } = room;

            if (!util.checkMandatoryFields([Code, Floor, Building, Type, NumberOfSeats])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            const existingRoom = await Room.findOne({ where: { Code } });
            if (existingRoom) {
                return res.status(406).json({
                    successful: false,
                    message: "Room code already exists."
                });
            }

            if (!['LV', 'GP'].includes(Building)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid Building."
                });
            }

            // Find the RoomType instead of validating the string directly
            const roomType = await RoomType.findOne({ where: { Type } });
            if (!roomType) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid Room Type."
                });
            }

            // Validate NumberOfSeats is a positive integer
            if (!Number.isInteger(Number(NumberOfSeats)) || Number(NumberOfSeats) < 1) {
                return res.status(406).json({
                    successful: false,
                    message: "Number of seats must be a positive integer."
                });
            }

            const newRoom = await Room.create({
                Code,
                Floor,
                Building,
                NumberOfSeats,
                RoomTypeId: roomType.id  // Associate with the RoomType through its ID
            });

            const token = req.cookies?.refreshToken;
            if (!token) {
                return res.status(401).json({
                    successful: false,
                    message: "Unauthorized: refreshToken not found."
                });
            }

            let decoded;
            try {
                decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
            } catch (err) {
                return res.status(403).json({
                    successful: false,
                    message: "Invalid refreshToken."
                });
            }

            const accountId = decoded.id || decoded.accountId;
            const page = 'Room';
            const details = `Added Room: ${Building}${Code} floor: ${Floor}, type: ${Type}, seats: ${NumberOfSeats}`;

            await addHistoryLog(accountId, page, details);
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new room."
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

module.exports = { addRoom };

const getAllRoom = async (req, res, next) => {
    try {
        let room = await Room.findAll({
            include: [{
                model: RoomType,
                attributes: ['id', 'Type']
            }]
        });

        if (!room || room.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No room found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all rooms",
                count: room.length,
                data: room
            })
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getRoom = async (req, res, next) => {
    try {
        let room = await Room.findByPk(req.params.id, {
            include: [{
                model: RoomType,
                attributes: ['id', 'Type']
            }]
        });

        if (!room) {
            res.status(404).send({
                successful: false,
                message: "Room not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Successfully retrieved room.",
                data: room
            });
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const deleteRoom = async (req, res, next) => {
    try {
        // Find the professor before deletion (to log the professor's name)
        const room = await Room.findOne({
            where: {
                id: req.params.id, // Replace with the ID of the record you want to delete
            },
        });

        if (!room) {
            return res.status(400).send({
                successful: false,
                message: "Room not found."
            });
        }

        // Log the archive action
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({
                successful: false,
                message: "Unauthorized: refreshToken not found."
            });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, REFRESH_TOKEN_SECRET); // or your secret key
        } catch (err) {
            return res.status(403).json({
                successful: false,
                message: "Invalid refreshToken."
            });
        }
        const accountId = decoded.id || decoded.accountId; // adjust based on your token payload
        const page = 'Room';
        const details = `Deleted Room for: ${room.Building} ${room.Code}`; // Include professor's name or other info

        await addHistoryLog(accountId, page, details);

        const deleteRoom = await room.destroy();

        if (deleteRoom) {
            res.status(200).send({
                successful: true,
                message: "Successfully deleted room."
            })
        } else {
            res.status(400).send({
                successful: false,
                message: "Room not found."
            })
        }
    } catch (err) {
        res.status(500).send({
            successful: false,
            message: err.message
        });
    }
}

const updateRoom = async (req, res, next) => {
    try {
        let room = await Room.findByPk(req.params.id, {
            include: [{ model: RoomType }]
        });

        if (!room) {
            return res.status(404).json({
                successful: false,
                message: "Room not found"
            });
        }

        const { Code, Floor, Building, RoomTypeId, NumberOfSeats } = req.body;

        if (!util.checkMandatoryFields([Code, Floor, Building, RoomTypeId, NumberOfSeats])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        if (!['LV', 'GP'].includes(Building)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid Building."
            });
        }

        // Check if the RoomTypeId is valid
        const roomType = await RoomType.findByPk(RoomTypeId);
        if (!roomType) {
            return res.status(406).json({
                successful: false,
                message: "Invalid Room Type."
            });
        }

        // Validate NumberOfSeats is a positive integer
        if (!Number.isInteger(Number(NumberOfSeats)) || Number(NumberOfSeats) < 1) {
            return res.status(406).json({
                successful: false,
                message: "Number of seats must be a positive integer."
            });
        }

        if (Code !== room.Code) {
            const roomConflict = await Room.findOne({ where: { Code } });
            if (roomConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Room already exists."
                });
            }
        }

        // Store old values for history log
        const oldRoom = {
            Code: room.Code,
            Floor: room.Floor,
            Building: room.Building,
            RoomType: room.RoomType ? room.RoomType.Type : 'N/A',
            NumberOfSeats: room.NumberOfSeats
        };

        const updatedRoom = await room.update({
            Code,
            Floor,
            Building,
            RoomTypeId,  // Update the foreign key to RoomType
            NumberOfSeats
        });

        // Log the update action
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({
                successful: false,
                message: "Unauthorized: refreshToken not found."
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
        } catch (err) {
            return res.status(403).json({
                successful: false,
                message: "Invalid refreshToken."
            });
        }

        // Get the new room type for history log
        const newRoomType = await RoomType.findByPk(RoomTypeId);

        const accountId = decoded.id || decoded.accountId;
        const page = 'Room';
        const details = `Updated Room: Old; Code: ${oldRoom.Code}, Floor: ${oldRoom.Floor}, Building: ${oldRoom.Building}, Type: ${oldRoom.RoomType}, Seats: ${oldRoom.NumberOfSeats};;; New; Code: ${Code}, Floor: ${Floor}, Building: ${Building}, Type: ${newRoomType.Type}, Seats: ${NumberOfSeats}`;

        await addHistoryLog(accountId, page, details);

        // Return the updated room with its associated RoomType
        const refreshedRoom = await Room.findByPk(updatedRoom.id, {
            include: [{ model: RoomType }]
        });

        return res.status(200).json({
            successful: true,
            message: "Successfully updated room.",
            data: refreshedRoom
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

const addDeptRoom = async (req, res) => {
    try {
        const { roomId, deptId } = req.body;

        if (!util.checkMandatoryFields([roomId, deptId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const room = await Room.findByPk(roomId);
        if (!room) {
            return res.status(404).json({
                successful: false,
                message: "Room not found."
            });
        }

        const dept = await Department.findByPk(deptId);
        if (!dept) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const existingPairing = await room.hasRoomDepts(deptId);
        if (existingPairing) {
            return res.status(400).json({
                successful: false,
                message: "This room is already associated with this department."
            });
        }

        await room.addRoomDepts(deptId);

        return res.status(200).json({
            successful: true,
            message: "Successfully associated room with department."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const deleteDeptRoom = async (req, res) => {
    try {
        const { roomId, deptId } = req.body;

        if (!util.checkMandatoryFields([roomId, deptId])) {
            return res.status(400).json({
                successful: false,
                message: "Missing required fields: roomId or deptId."
            });
        }

        const room = await Room.findByPk(roomId);
        if (!room) {
            return res.status(404).json({
                successful: false,
                message: "Room not found."
            });
        }

        const dept = await Department.findByPk(deptId);
        if (!dept) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const existingAssociation = await room.hasRoomDepts(deptId);
        if (!existingAssociation) {
            return res.status(409).json({
                successful: false,
                message: "No existing association between this room and department."
            });
        }

        await room.removeRoomDepts(deptId);

        return res.status(200).json({
            successful: true,
            message: "Association successfully deleted."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const getRoomsByDept = async (req, res, next) => {
    try {
        const deptId = req.params.id
        const rooms = await Room.findAll({
            order: [['Building', 'ASC'], ['Floor', 'ASC'], ['Code', 'ASC']],
            attributes: { exclude: ['RoomDepts'] },
            include: [
                {
                    model: Department,
                    as: 'RoomDepts',
                    where: {
                        id: deptId,
                    },
                    attributes: [],
                    through: {
                        attributes: []
                    }
                },
                {
                    model: RoomType,
                    attributes: ['id', 'Type']
                }
            ]
        })
        if (!rooms || rooms.length == 0) {
            res.status(400).send({
                successful: false,
                message: "No rooms found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all rooms",
                count: rooms.length,
                data: rooms
            })
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const updateDeptRoom = async (req, res, next) => {
    try {
        const { oldRoomId, oldDeptId, newRoomId, newDeptId } = req.body;

        if (!util.checkMandatoryFields([oldRoomId, oldDeptId, newRoomId, newDeptId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const oldRoom = await Room.findByPk(oldRoomId);
        if (!oldRoom) {
            return res.status(404).json({
                successful: false,
                message: "Room not found."
            });
        }

        const oldDept = await Department.findByPk(oldDeptId);
        if (!oldDept) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const newRoom = await Room.findByPk(newRoomId);
        if (!newRoom) {
            return res.status(404).json({
                successful: false,
                message: "Room not found."
            });
        }

        const newDept = await Department.findByPk(newDeptId);
        if (!newDept) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const existingAssociation = await oldRoom.hasRoomDepts(oldDeptId)
        if (!existingAssociation) {
            return res.status(404).json({
                successful: false,
                message: "Association between the room and department does not exist."
            });
        }

        const existingPairing = await newRoom.hasRoomDepts(newDeptId);
        if (existingPairing) {
            return res.status(400).json({
                successful: false,
                message: "This room is already associated with this department."
            })
        }

        await oldDept.removeDeptRooms(oldRoomId)
        await newDept.addDeptRooms(newRoomId)

        return res.status(200).json({
            successful: true,
            message: "Association updated successfully."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}


module.exports = {
    addRoom,
    getAllRoom,
    getRoom,
    deleteRoom,
    updateRoom,
    addDeptRoom,
    deleteDeptRoom,
    getRoomsByDept,
    updateDeptRoom
};
