const { RoomType, Room, Assignation } = require('../models')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize');
const { REFRESH_TOKEN_SECRET } = process.env
const util = require('../../utils')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const getAllRoomTypes = async (req, res, next) => {
    try {
        let roomTypes = await RoomType.findAll()
        if (!roomTypes || roomTypes.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No room types found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all room types",
                count: roomTypes.length,
                data: roomTypes
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

const getRoomType = async (req, res, next) => {
    try {
        let roomType = await RoomType.findByPk(req.params.id);

        if (!roomType) {
            res.status(404).send({
                successful: false,
                message: "Room type not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Successfully retrieved room type.",
                data: roomType
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



const addRoomType = async (req, res, next) => {
    try {
        let roomTypes = req.body;

        // Check if the request body contains an array of room types
        if (!Array.isArray(roomTypes)) {
            // If not an array, convert the single room type to an array
            roomTypes = [roomTypes];
        }

        for (const roomType of roomTypes) {
            const { Type } = roomType;

            if (!util.checkMandatoryFields([Type])) {
                return res.status(400).json({
                    successful: false,
                    message: "Room type is required."
                });
            }

            const existingRoomType = await RoomType.findOne({ where: { Type } });
            if (existingRoomType) {
                return res.status(406).json({
                    successful: false,
                    message: "Room type already exists."
                });
            }

            const newRoomType = await RoomType.create({
                Type
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
            const page = 'RoomType';
            const details = `Added Room Type: ${Type}`;

            await addHistoryLog(accountId, page, details);
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new room type."
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const updateRoomType = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { Type } = req.body;

        if (!util.checkMandatoryFields([Type])) {
            return res.status(400).json({
                successful: false,
                message: "Room type is required."
            });
        }

        // Check if room type exists
        const roomType = await RoomType.findByPk(id);
        if (!roomType) {
            return res.status(404).json({
                successful: false,
                message: "Room type not found."
            });
        }

        // Check if the new type already exists (but not for this record)
        const existingRoomType = await RoomType.findOne({
            where: {
                Type,
                id: { [Op.ne]: id } // Not equal to current ID
            }
        });

        if (existingRoomType) {
            return res.status(406).json({
                successful: false,
                message: "Room type already exists."
            });
        }

        // Update the room type
        await roomType.update({ Type });

        // Get the refresh token for history log
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
        const page = 'RoomType';
        const details = `Updated Room Type from: ${roomType.Type} to: ${Type}`;

        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: "Successfully updated room type."
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const deleteRoomType = async (req, res, next) => {
    try {
        // Find the room type before deletion (to log the type name)
        const roomType = await RoomType.findOne({
            where: {
                id: req.params.id, // The ID of the record to delete
            },
        });

        if (!roomType) {
            return res.status(400).send({
                successful: false,
                message: "Room type not found."
            });
        }

        // Check if there are rooms using this room type
        const roomsUsingType = await Room.count({
            where: {
                RoomTypeId: req.params.id
            }
        });
        const assignationUsingType = await Assignation.count({
            where: {
                RoomTypeId: req.params.id
            }
        });

        if (roomsUsingType > 0 || assignationUsingType > 0) {
            return res.status(409).send({
                successful: false,
                message: "Cannot delete room type as it is being used by existing rooms or assignations."
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
        const page = 'RoomType';
        const details = `Deleted Room Type: ${roomType.Type}`;

        await addHistoryLog(accountId, page, details);

        const deleteResult = await roomType.destroy();

        if (deleteResult) {
            res.status(200).send({
                successful: true,
                message: "Successfully deleted room type."
            });
        } else {
            res.status(400).send({
                successful: false,
                message: "Room type not found."
            });
        }
    } catch (err) {
        res.status(500).send({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

module.exports = {
    getAllRoomTypes,
    getRoomType,
    addRoomType,
    updateRoomType,
    deleteRoomType
};