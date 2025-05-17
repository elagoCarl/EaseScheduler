const { Room, Department, RoomType, sequelize } = require('../models')
const jwt = require('jsonwebtoken')
const { REFRESH_TOKEN_SECRET } = process.env
const util = require('../../utils')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');
const { get } = require('../routers/program_rtr');

const isAlphanumeric = (str) => /^[a-zA-Z0-9]+$/.test(str);

const addRoom = async (req, res, next) => {
    try {
        let rooms = req.body;

        // Check if the request body contains an array of rooms
        if (!Array.isArray(rooms)) {
            // If not an array, convert the single room to an array
            rooms = [rooms];
        }

        for (const room of rooms) {
            const { Code, Floor, Building, PrimaryTypeId } = room;

            if (!util.checkMandatoryFields([Code, Floor, Building, PrimaryTypeId])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            if (!isAlphanumeric(Code)) {
                return res.status(406).json({
                    successful: false,
                    message: "Room Code must contain only letters and numbers."
                });
            }

            const existingRoom = await Room.findOne({ where: { Code, Building } });
            if (existingRoom) {
                return res.status(406).json({
                    successful: false,
                    message: "Room code already exists for the same building."
                });
            }

            if (!['LV', 'GP'].includes(Building)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid Building."
                });
            }

            const newRoom = await Room.create({
                Code,
                Floor,
                Building,
                PrimaryTypeId
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
            const details = `Added Room: ${Building}${Code} floor: ${Floor}`;

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
}

const getAllRoom = async (req, res, next) => {
    try {
        let room = await Room.findAll({
            include: [{
                model: RoomType,
                as: 'TypeRooms',
                attributes: ['id', 'Type'],
                through: {
                    attributes: []
                }
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

const getPrimaryRoom = async (req, res, next) => {
    try {

        const room = await Room.findByPk(req.params.id)

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        })
    }
}

const getRoom = async (req, res, next) => {
    try {
        let room = await Room.findByPk(req.params.id, {
            include: [{
                model: RoomType,
                as: 'TypeRooms',
                attributes: ['id', 'Type'],
                through: {
                    attributes: []
                }
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
        // Find the room before deletion (to log the room details)
        const room = await Room.findOne({
            where: {
                id: req.params.id,
            },
        });

        if (!room) {
            return res.status(400).send({
                successful: false,
                message: "Room not found."
            });
        }

        // Check if room has associated room types
        const typeRoomCount = await sequelize.models.TypeRoom.count({
            where: {
                RoomId: req.params.id
            }
        });

        if (typeRoomCount > 0) {
            return res.status(409).send({
                successful: false,
                message: "Cannot delete this room as it has associated room types. Please remove all room types from this room first."
            });
        }

        // Log the delete action
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
        const details = `Deleted Room: ${room.Building} ${room.Code}`;

        await addHistoryLog(accountId, page, details);

        const deleteResult = await room.destroy();

        if (deleteResult) {
            res.status(200).send({
                successful: true,
                message: "Successfully deleted room."
            });
        } else {
            res.status(400).send({
                successful: false,
                message: "Room not found."
            });
        }
    } catch (err) {
        // Check for specific database constraint error
        if (err.name === 'SequelizeForeignKeyConstraintError' ||
            (err.message && err.message.includes('foreign key constraint fails'))) {
            return res.status(409).send({
                successful: false,
                message: "Cannot delete this room as it is being used by other records in the system. Please remove all associated data first."
            });
        }

        res.status(500).send({
            successful: false,
            message: err.message || "An unexpected error occurred while deleting the room."
        });
    }
};

const updateRoom = async (req, res, next) => {
    try {
        const roomId = req.params.id;
        const room = await Room.findByPk(roomId);

        if (!room) {
            return res.status(404).json({
                successful: false,
                message: "Room not found"
            });
        }

        const { Code, Floor, Building, PrimaryTypeId, RoomTypeIds } = req.body;

        // Validate required fields
        if (!util.checkMandatoryFields([Code, Floor, Building, PrimaryTypeId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        if (!isAlphanumeric(Code)) {
            return res.status(406).json({
                successful: false,
                message: "Room Code must contain only letters and numbers."
            });
        }

        // Validate building
        if (!['LV', 'GP'].includes(Building)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid Building. Must be either 'LV' or 'GP'."
            });
        }

        // Validate room code uniqueness if it changed
        if (Code !== room.Code) {
            const roomConflict = await Room.findOne({ where: { Code, Building } });
            if (roomConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Room code already exists for the same building."
                });
            }
        }

        // Validate that PrimaryTypeId is not included in RoomTypeIds
        if (RoomTypeIds && Array.isArray(RoomTypeIds) && RoomTypeIds.includes(PrimaryTypeId)) {
            return res.status(406).json({
                successful: false,
                message: `PrimaryTypeId (${PrimaryTypeId}) cannot be included in RoomTypeIds for room ${Code}.`
            });
        }

        // Ensure all room types exist
        const roomTypes = await RoomType.findAll({
            where: { id: RoomTypeIds }
        });

        if (roomTypes.length !== RoomTypeIds.length) {
            return res.status(400).json({
                successful: false,
                message: "One or more selected room types do not exist."
            });
        }

        // Store old values for history log
        const oldRoom = {
            Code: room.Code,
            Floor: room.Floor,
            Building: room.Building,
            PrimaryTypeId: room.PrimaryTypeId
        };

        // Get old room types for history log
        const oldRoomTypes = await room.getTypeRooms();
        const oldRoomTypeNames = oldRoomTypes.map(type => type.Type).join(', ');

        // Begin transaction
        const t = await sequelize.transaction();

        try {
            // Update the room
            await room.update({
                Code,
                Floor,
                Building,
                PrimaryTypeId
            }, { transaction: t });

            // Update room types (clear and re-add)
            await room.setTypeRooms(RoomTypeIds, { transaction: t });

            // Commit transaction
            await t.commit();

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

            // Get new room type names for history log
            const newRoomTypeNames = roomTypes.map(type => type.Type).join(', ');

            const accountId = decoded.id || decoded.accountId;
            const page = 'Room';
            const details = `Updated Room: Old; Code: ${oldRoom.Code}, Floor: ${oldRoom.Floor}, Building: ${oldRoom.Building}, Types: ${oldRoomTypeNames};;; New; Code: ${Code}, Floor: ${Floor}, Building: ${Building}, Types: ${newRoomTypeNames}`;

            await addHistoryLog(accountId, page, details);

            // Return the updated room with its associated RoomTypes
            const refreshedRoom = await Room.findByPk(room.id, {
                include: [{ model: RoomType, as: 'TypeRooms' }]
            });

            return res.status(200).json({
                successful: true,
                message: "Successfully updated room.",
                data: refreshedRoom
            });
        } catch (err) {
            // Rollback transaction on error
            await t.rollback();
            throw err;
        }
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
}

const getRoomsByDept = async (req, res, next) => {
    try {
        const deptId = req.params.id;
        const rooms = await Room.findAll({
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['RoomDepts'] },
            include: [
                {
                    model: Department,
                    as: 'RoomDepts',
                    where: { id: deptId },
                    attributes: [],
                    through: { attributes: [] }
                },
                {
                    model: RoomType,
                    attributes: ['id', 'Type'],
                },
                {
                    model: RoomType,
                    as: 'TypeRooms',
                    attributes: ['id', 'Type'],
                    through: { attributes: [] }
                }
            ]
        });

        res.status(200).send({
            successful: true,
            message: rooms.length ? "Retrieved all rooms" : "No rooms found",
            count: rooms.length,
            data: rooms
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


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

const addTypeRoom = async (req, res) => {
    try {
        const { RoomId, RoomTypeId } = req.body;

        if (!util.checkMandatoryFields([RoomId, RoomTypeId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        // Find the room
        const room = await Room.findByPk(RoomId);
        if (!room) {
            return res.status(404).json({
                successful: false,
                message: "Room not found."
            });
        }

        // Check if the RoomTypeId is the same as the room's PrimaryTypeId
        if (room.PrimaryTypeId === RoomTypeId) {
            return res.status(400).json({
                successful: false,
                message: "Room Type cannot be the same as the Primary Room Type."
            });
        }

        // Find the room type being added
        const roomType = await RoomType.findByPk(RoomTypeId);
        if (!roomType) {
            return res.status(404).json({
                successful: false,
                message: "Room Type not found."
            });
        }

        // Find the primary room type
        const primaryRoomType = await RoomType.findByPk(room.PrimaryTypeId);
        if (!primaryRoomType) {
            return res.status(404).json({
                successful: false,
                message: "Primary Room Type not found."
            });
        }

        // Check if the room type value is the same as the primary room type value
        if (roomType.Type === primaryRoomType.Type) {
            return res.status(400).json({
                successful: false,
                message: `Room Type "${roomType.Type}" cannot be added as it matches the Primary Room Type.`
            });
        }

        // Check if this room type is already associated with the room
        const existingType = await room.hasTypeRooms(RoomTypeId);
        if (existingType) {
            return res.status(406).json({
                successful: false,
                message: "Room and Type association already exists."
            });
        }

        // Add the room type association
        const newTypeRoom = await room.addTypeRooms(RoomTypeId);

        // Add history log if needed
        // (assuming history logging functionality is implemented elsewhere)

        return res.status(201).json({
            successful: true,
            message: "Successfully associated room type.",
            data: newTypeRoom
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

const deleteTypeRoom = async (req, res) => {
    try {
        const { RoomId, RoomTypeId } = req.body;

        if (!util.checkMandatoryFields([RoomId, RoomTypeId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const room = await Room.findByPk(RoomId);
        if (!room) {
            return res.status(404).json({
                successful: false,
                message: "Room not found."
            });
        }

        const roomType = await RoomType.findByPk(RoomTypeId);
        if (!roomType) {
            return res.status(404).json({
                successful: false,
                message: "Room Type not found."
            });
        }

        const existingAssociation = await room.hasTypeRooms(RoomTypeId);
        if (!existingAssociation) {
            return res.status(409).json({
                successful: false,
                message: "No existing association between this room and type."
            });
        }

        await room.removeTypeRooms(RoomTypeId);

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
}

const getPrimaryRoomType = async (req, res) => {
    try {
        // Find the room by ID
        const room = await Room.findByPk(req.params.id, {
            attributes: ['id', 'Code', 'PrimaryTypeId'],
            include: [{
                model: RoomType,
                as: 'RoomType', // This uses the belongsTo relationship with foreignKey: 'PrimaryTypeId'
                attributes: ['id', 'Type']
            }]
        });

        if (!room) {
            return res.status(404).json({
                successful: false,
                message: "Room not found.",
                data: null
            });
        }

        if (!room.RoomType) {
            return res.status(404).json({
                successful: false,
                message: "No primary room type assigned to this room.",
                data: null
            });
        }

        return res.status(200).json({
            successful: true,
            message: "Successfully retrieved primary room type.",
            data: {
                roomId: room.id,
                roomCode: room.Code,
                primaryTypeId: room.PrimaryTypeId,
                primaryType: room.RoomType.Type
            }
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

const getRoomTypeByRoom = async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id, {
            include: [{
                model: RoomType,
                as: 'TypeRooms',
                attributes: ['id', 'Type'],
                through: {
                    attributes: []
                }
            }]
        });

        if (room.TypeRooms.length === 0) {
            return res.status(404).json({
                successful: false,
                message: "Room not found.",
                data: []
            });
        }

        return res.status(200).json({
            successful: true,
            message: "Successfully retrieved room type.",
            data: room.TypeRooms
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const addRoomWithTypes = async (req, res, next) => {
    try {
        let rooms = req.body.rooms;
        const roomTypes = req.body.roomTypes || [];

        // Check if rooms is provided and convert to array if it's a single room
        if (!rooms) {
            return res.status(400).json({
                successful: false,
                message: "Room data is required."
            });
        }

        if (!Array.isArray(rooms)) {
            rooms = [rooms];
        }

        // Pre-validate all rooms before starting transaction
        for (const room of rooms) {
            const { Code, Floor, Building, PrimaryTypeId, RoomTypeIds } = room;

            // Validate room data
            if (!util.checkMandatoryFields([Code, Floor, Building, PrimaryTypeId])) {
                return res.status(400).json({
                    successful: false,
                    message: `A mandatory room field is missing for room ${Code}.`
                });
            }

            if (!isAlphanumeric(Code)) {
                return res.status(406).json({
                    successful: false,
                    message: "Room Code must contain only letters and numbers."
                });
            }

            // Check if room code already exists
            const existingRoom = await Room.findOne({ where: { Code, Building } });
            if (existingRoom) {
                return res.status(409).json({
                    successful: false,
                    message: `Room code ${Code} already exists for the same building.`
                });
            }

            // Validate building
            if (!['LV', 'GP'].includes(Building)) {
                return res.status(400).json({
                    successful: false,
                    message: `Invalid Building for room ${Code}. Must be either 'LV' or 'GP'.`
                });
            }

            // Validate that PrimaryTypeId is not included in RoomTypeIds
            if (RoomTypeIds && Array.isArray(RoomTypeIds) && RoomTypeIds.includes(PrimaryTypeId)) {
                return res.status(400).json({
                    successful: false,
                    message: `PrimaryTypeId (${PrimaryTypeId}) cannot be included in RoomTypeIds for room ${Code}.`
                });
            }

            // Fetch primary room type to compare with other room types
            const primaryRoomType = await RoomType.findByPk(PrimaryTypeId);
            if (!primaryRoomType) {
                return res.status(404).json({
                    successful: false,
                    message: `Primary Room Type with ID ${PrimaryTypeId} not found.`
                });
            }

            // Validate room types exist if provided and ensure they're unique from primary type
            if (RoomTypeIds && Array.isArray(RoomTypeIds) && RoomTypeIds.length > 0) {
                for (const typeId of RoomTypeIds) {
                    const roomType = await RoomType.findByPk(typeId);
                    if (!roomType) {
                        return res.status(404).json({
                            successful: false,
                            message: `Room Type with ID ${typeId} not found.`
                        });
                    }

                    // Check if room type value is the same as primary type value
                    if (roomType.Type === primaryRoomType.Type) {
                        return res.status(400).json({
                            successful: false,
                            message: `Room Type "${roomType.Type}" cannot be both a primary type and an additional room type for room ${Code}.`
                        });
                    }
                }
            }
        }

        // Validate room types to be created
        if (roomTypes.length > 0) {
            for (const roomType of roomTypes) {
                if (!roomType.Type) {
                    return res.status(400).json({
                        successful: false,
                        message: "Room Type is required."
                    });
                }
            }
        }

        // Start a transaction to ensure data consistency
        const result = await sequelize.transaction(async (t) => {
            const createdRooms = [];

            for (const room of rooms) {
                const { Code, Floor, Building, PrimaryTypeId, RoomTypeIds } = room;

                // Create new room
                const newRoom = await Room.create({
                    Code,
                    Floor,
                    Building,
                    PrimaryTypeId
                }, { transaction: t });

                // Associate room types if provided
                if (RoomTypeIds && Array.isArray(RoomTypeIds) && RoomTypeIds.length > 0) {
                    // Add room types to the room
                    await newRoom.setTypeRooms(RoomTypeIds, { transaction: t });
                }

                createdRooms.push(newRoom);
            }
            return createdRooms;
        });

        // Add history log
        const token = req.cookies?.refreshToken;
        if (token) {
            try {
                const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
                const accountId = decoded.id || decoded.accountId;
                const page = 'Room';

                for (const room of result) {
                    const details = `Added Room: ${room.Building}${room.Code} floor: ${room.Floor}, seats: ${room.NumberOfSeats}`;
                    await addHistoryLog(accountId, page, details);
                }
            } catch (err) {
                console.error("Error logging history:", err.message);
                // Continue execution even if history logging fails
            }
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added room(s) with associated types.",
            data: result
        });
    }
    catch (err) {
        console.error("Error in addRoomWithTypes:", err);
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

const getAllRooms = async (req, res, next) => {
    try {
        const rooms = await Room.findAll({
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Department,
                    as: 'RoomDepts',
                    attributes: ['id', 'Name'],
                    through: { attributes: [] }
                },
                {
                    model: RoomType,
                    attributes: ['id', 'Type'],
                },
                {
                    model: RoomType,
                    as: 'TypeRooms',
                    attributes: ['id', 'Type'],
                    through: { attributes: [] }
                }
            ]
        });

        res.status(200).send({
            successful: true,
            message: rooms.length ? "Retrieved all rooms" : "No rooms found",
            count: rooms.length,
            data: rooms
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

module.exports = {
    addRoom,
    getAllRoom,
    getRoom,
    deleteRoom,
    updateRoom,
    addDeptRoom,
    deleteDeptRoom,
    getRoomsByDept,
    updateDeptRoom,
    addTypeRoom,
    deleteTypeRoom,
    getRoomTypeByRoom,
    addRoomWithTypes,
    getPrimaryRoomType,
    getAllRooms
};
