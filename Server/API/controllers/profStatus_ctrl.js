const { ProfStatus } = require('../models')
const jwt = require('jsonwebtoken')
const { REFRESH_TOKEN_SECRET } = process.env
const util = require('../../utils')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');
const { Op } = require('sequelize');

const addStatus = async (req, res, next) => {
    try {
        let status = req.body;

        // Check if the request body contains an array of professors
        if (!Array.isArray(status)) {
            // If not an array, convert the single professor to an array
            status = [status];
        }

        for (const stat of status) {
            const { Status, Max_units } = stat;

            if (!util.checkMandatoryFields([Status, Max_units])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                })
            }

            const existingStatus = await ProfStatus.findOne({ where: { Status: { [Op.like]: Status } } });
            if (existingStatus) {
                return res.status(406).json({
                    successful: false,
                    message: "Status already exists."
                })
            }

            if(Max_units < 1 || Max_units > 40) {
                return res.status(400).json({
                    successful: false,
                    message: "Max units must be between 1 and 40."
                })
            }

            const newStat = await ProfStatus.create({
                Status: Status,
                Max_units: Max_units
            })

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
            const page = 'ProfStatus';
            const details = `Added Professor status: ${Status} Max Units: ${Max_units}`;

            await addHistoryLog(accountId, page, details);

        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new status."
        })

    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getAllStatus = async (req, res, next) => {
    try {
        let status = await ProfStatus.findAll()
        if (!status || status.length === 0) {
            res.status(400).send({
                successful: false,
                message: "No status found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all professor status",
                count: status.length,
                data: status
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

const getStatus = async (req, res, next) => {
    try {
        let status = await ProfStatus.findByPk(req.params.id);

        if (!status) {
            res.status(404).send({
                successful: false,
                message: "Professor status not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Successfully retrieved professor status.",
                data: status
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

const deleteStatus = async (req, res, next) => {
    try {
        // Find the course before deletion for detailed logging
        const status = await ProfStatus.findOne({
            where: { id: req.params.id }
        });

        if (!status) {
            return res.status(400).send({
                successful: false,
                message: "Professor status not found."
            });
        }

        // Delete the course
        await ProfStatus.destroy({
            where: { id: req.params.id }
        });

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
        const page = 'ProfStaus';
        const details = `Deleted Status: ${status.Status}`;

        await addHistoryLog(accountId, page, details);

        res.status(200).send({
            successful: true,
            message: "Successfully deleted professor status."
        });
    } catch (err) {
        res.status(500).send({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const updateStatus = async (req, res, next) => {
    try {
        let status = await ProfStatus.findByPk(req.params.id)
        const { Status, Max_units } = req.body

        if (!status) {
            res.status(404).send({
                successful: false,
                message: "Professor status not found"
            });
        }
        if (!util.checkMandatoryFields([Status, Max_units])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            })
        }

        if(Max_units < 1 || Max_units > 40) {
            return res.status(400).json({
                successful: false,
                message: "Max units must be between 1 and 40."
            })
        }

        if (Status !== status.Status) {
            const statConflict = await ProfStatus.findOne({ where: { Status: { [Op.like]: Status } } })
            if (statConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Professor status already exists."
                })
            }
        }

        const updateStatus = await status.update({ Status, Max_units })
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
        const page = 'ProfStatus';
        const details = `Updated Professor Status: ${status.Status}`;

        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: "Successfully updated professor status."
        })
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

module.exports = {
    addStatus,
    getAllStatus,
    getStatus,
    deleteStatus,
    updateStatus
}