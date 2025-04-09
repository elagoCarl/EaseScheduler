const { ProfAvail, Professor } = require('../models')
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;
const util = require('../../utils')
const { Op } = require('sequelize')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

//LAGYAN NG PREFIX NA ZERO ANG INPUT SA HOURS KUNG SINGLE DIGIT LANG

// Add Professor Availability (Single or Bulk)
const addProfessorAvail = async (req, res, next) => {
    try {
        let profAvails = req.body;

        if (!Array.isArray(profAvails)) {
            profAvails = [profAvails];
        }

        for (const profAvail of profAvails) {
            const { Day, ProfessorId, Start_time, End_time } = profAvail;

            if (!util.checkMandatoryFields([Day, ProfessorId, Start_time, End_time])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            // Check if the referenced Professor exists
            const prof = await Professor.findByPk(ProfessorId);
            if (!prof) {
                return res.status(404).json({
                    successful: false,
                    message: 'Professor not found.'
                });
            }

            if (!util.checkValidDay(Day)) {
                return res.status(400).json({
                    successful: false,
                    message: "Invalid day. Please provide a valid day of the week (Monday-Sunday)."
                })
            }


            if (End_time <= Start_time) {
                return res.status(400).json({
                    successful: false,
                    message: "End time must be greater than Start time."
                });
            }

            // Check for overlapping times in the database
            const overlapping = await ProfAvail.findOne({
                where: {
                    ProfessorId,
                    Day,
                    [Op.or]: [
                        {
                            Start_time: {
                                [Op.lt]: End_time
                            },
                            End_time: {
                                [Op.gt]: Start_time
                            }
                        }
                    ]
                }
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
            const page = 'Professor Availability';
            const details = `Added Professor Availability${prof.Day, prof.ProfessorId}`;

            await addHistoryLog(accountId, page, details);

            if (overlapping) {
                return res.status(400).json({
                    successful: false,
                    message: "The provided time range overlaps with an existing availability."
                });
            }

            // Check for overlapping times in the request body
            for (const other of profAvails) {
                if (
                    other !== profAvail &&
                    other.Day === Day &&
                    other.ProfessorId === ProfessorId &&
                    other.Start_time < End_time &&
                    other.End_time > Start_time
                ) {
                    return res.status(400).json({
                        successful: false,
                        message: "Overlapping times detected within the request body."
                    });
                }
            }

            // Create availability
            await ProfAvail.create({ Day, ProfessorId, Start_time, End_time });
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added Professor Availability."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
}

// Get a Single Professor Availability by ID
const getProfessorAvail = async (req, res, next) => {
    try {
        const professorAvail = await ProfAvail.findByPk(req.params.id);

        if (!professorAvail) {
            return res.status(404).json({
                successful: false,
                message: "Professor Availability not found."
            });
        }

        return res.status(200).json({
            successful: true,
            data: professorAvail
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
}

const getProfAvailByProf = async (req, res, next) => {
    try {
        const prof = await Professor.findByPk(req.params.id);
        if (!prof) {
            return res.status(404).json({
                successful: false,
                message: "Professor not found."
            })
        }

        const professorAvails = await ProfAvail.findAll({
            where: { ProfessorId: req.params.id }
        })

        if (professorAvails.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No availabilities found for the given professor."
            })
        }

        return res.status(200).send({
            successful: true,
            message: "Retrieved professor's availabilities",
            count: professorAvails.length,
            data: professorAvails
        })

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
}

// Update Professor Availability by ID
const updateProfessorAvail = async (req, res, next) => {
    try {
        const { Day, End_time, Start_time, ProfessorId } = req.body;

        if (!util.checkMandatoryFields([Day, End_time, Start_time, ProfessorId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const profAvail = await ProfAvail.findByPk(req.params.id);
        if (!profAvail) {
            return res.status(404).json({
                successful: false,
                message: "Professor Availability not found."
            });
        }

        const prof = await Professor.findByPk(ProfessorId);
        if (!prof) {
            return res.status(404).json({
                successful: false,
                message: "Professor not found."
            });
        }

        if (!util.checkValidDay(Day)) {
            return res.status(400).json({
                successful: false,
                message: "Invalid day. Please provide a valid day of the week (Monday-Sunday)."
            })
        }

        if (End_time <= Start_time) {
            return res.status(400).json({
                successful: false,
                message: "End time must be greater than Start time."
            });
        }

        // Check for overlapping times in the database
        const overlapping = await ProfAvail.findOne({
            where: {
                ProfessorId,
                Day,
                id: { [Op.ne]: req.params.id }, // Exclude the current record being updated
                [Op.or]: [
                    {
                        Start_time: {
                            [Op.lt]: End_time
                        },
                        End_time: {
                            [Op.gt]: Start_time
                        }
                    }
                ]
            }
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
        const page = 'Professor Availability';
        const details = `Updated Professor Availability: Old; Day: ${profAvail.Day}, Start Time: ${profAvail.Start_time}, End Time: ${profAvail.End_time}, Professor Id: ${profAvail.ProfessorId};;; New; Day: ${Day}, Start Time: ${Start_time}, End Time: ${End_time}, Professor Id: ${ProfessorId}`;

        await addHistoryLog(accountId, page, details);


        if (overlapping) {
            return res.status(400).json({
                successful: false,
                message: "The updated time range overlaps with an existing availability."
            });
        }

        // Update the availability
        await profAvail.update({ Day, Start_time, End_time, ProfessorId });

        return res.status(200).json({
            successful: true,
            message: "Professor Availability updated successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
}

// Delete Professor Availability by ID
const deleteProfessorAvail = async (req, res, next) => {
    try {
        const professorAvail = await ProfAvail.findByPk(req.params.id);
        if (!professorAvail) {
            return res.status(404).json({
                successful: false,
                message: "Professor Availability not found."
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
        const page = 'Professor Availability';
        const details = `Deleted Professor Availability${professorAvail.Day, professorAvail.ProfessorId}`;

        await addHistoryLog(accountId, page, details);


        await professorAvail.destroy();

        return res.status(200).json({
            successful: true,
            message: "Professor Availability deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
}

// Export the functions
module.exports = {
    addProfessorAvail,
    getProfessorAvail,
    getProfAvailByProf,
    updateProfessorAvail,
    deleteProfessorAvail
};
