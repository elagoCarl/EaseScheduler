const { Professor } = require('../models')
const util = require('../../utils')

const addProf = async (req, res, next) => {
    try {
        let professorsToAdd = req.body;

        // Check if the request body contains an array of professors
        if (!Array.isArray(professorsToAdd)) {
            // If not an array, convert the single professor to an array
            professorsToAdd = [professorsToAdd];
        }

        for (const professorData of professorsToAdd) {
            const { Name, Email, Status } = professorData;

            if (!util.checkMandatoryFields([Name, Email, Status])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                })
            }

            // Validate email format
            if (!util.validateEmail(Email)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid email format."
                });
            }

            if (!['Full-time', 'Part-time', 'Fixed-term'].includes(Status)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid status. Allowed values are: Full-time, Part-time, Fixed-term."
                });
            }

            // Check if the email already exists
            const existingEmail = await Professor.findOne({ where: { Email } });
            if (existingEmail) {
                return res.status(406).json({
                    successful: false,
                    message: "Email already exists. Please use a different email."
                })
            }

            const newProf = await Professor.create({
                Name: Name,
                Email: Email,
                Status: Status,
                Total_units: 0
            })
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new professor."
        })

    } 
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getAllProf = async (req, res, next) => {
    try {
        let professor = await Professor.findAll()
        if (!professor) {
            res.status(200).send({
                successful: true,
                message: "No professor found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all professors",
                count: professor.length,
                data: professor
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

const getProf = async (req, res, next) => {
    try {
        let prof = await Professor.findByPk(req.params.id);

        if (!prof) {
            res.status(404).send({
                successful: false,
                message: "Professor not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Successfully retrieved professor.",
                data: prof
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

module.exports = { addProf, getAllProf, getProf };
