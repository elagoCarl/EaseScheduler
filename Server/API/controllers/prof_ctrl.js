const { Professor, ProfStatus, Assignation } = require('../models')
const util = require('../../utils')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');


const addProf = async (req, res, next) => {
    try {
        let professorsToAdd = req.body;

        // Convert single object to array if not already an array
        if (!Array.isArray(professorsToAdd)) {
            professorsToAdd = [professorsToAdd];
        }

        const addedProfs = [];

        for (const professorData of professorsToAdd) {
            const { Name, Email, Status } = professorData;
            console.log("Professor Data:", { Name, Email, Status });

            if (!util.checkMandatoryFields([Name, Email, Status])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            // Validate email format
            if (!util.validateEmail(Email)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid email format."
                });
            }

            // Check if the status exists
            const status = await ProfStatus.findByPk(Status);
            if (!status) {
                return res.status(406).json({
                    successful: false,
                    message: "Professor status not found."
                });
            }

            // Check if the email already exists
            const existingEmail = await Professor.findOne({ where: { Email } });
            if (existingEmail) {
                return res.status(406).json({
                    successful: false,
                    message: "Email already exists. Please use a different email."
                });
            }

            // Create professor
            const newProf = await Professor.create({
                Name,
                Email,
                Total_units: 0,
                ProfStatusId: Status // Ensure the status is linked correctly
            });

            addedProfs.push(Name);
        }

        // Log the action
        const accountId = '1'; // Example account ID
        const page = 'Professor';
        const details = `Added Professor${addedProfs.length > 1 ? 's' : ''}: ${addedProfs.join(', ')}`;
        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: `Successfully added ${addedProfs.length} professor(s).`
        });

    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const getAllProf = async (req, res, next) => {
    try {
        let professors = await Professor.findAll({
            include: {
                model: ProfStatus,  // Include ProfStatus relation
                attributes: ['Status'] // Fetch only the Status column
            }
        });

        if (!professors || professors.length === 0) {
            return res.status(200).send({
                successful: true,
                message: "No professor found",
                count: 0,
                data: []
            });
        }

        // Format response to include status directly
        const formattedProfessors = professors.map(prof => ({
            id: prof.id,
            Name: prof.Name,
            Email: prof.Email,
            Total_units: prof.Total_units,
            Status: prof.ProfStatus ? prof.ProfStatus.Status : "Unknown" // Handle missing status
        }));

        return res.status(200).send({
            successful: true,
            message: "Retrieved all professors",
            count: formattedProfessors.length,
            data: formattedProfessors
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const getProf = async (req, res) => {
    try {
        const professor = await Professor.findByPk(req.params.id, {
            include: [
                {
                    model: ProfStatus,
                    attributes: ['id', 'Status'], // Include the status ID and name
                },
            ],
        });

        if (!professor) {
            return res.status(404).json({ message: "Professor not found" });
        }

        res.status(200).json({
            successful: true,
            message: "Professor retrieved successfully",
            data: professor
        });
    } catch (error) {
        res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

const deleteProf = async (req, res, next) => {
    try {
        // Find the professor before deletion (to log the professor's name)
        const professor = await Professor.findOne({
            where: {
                id: req.params.id, // Replace with the ID of the record you want to delete
            },
        });

        if (!professor) {
            return res.status(400).send({
                successful: false,
                message: "Professor not found."
            });
        }

        // Log the archive action
        const accountId = '1'; // Example account ID for testing
        const page = 'Professor';
        const details = `Deleted Professor record for: ${professor.Name}`; // Include professor's name or other info

        await addHistoryLog(accountId, page, details);

        // Delete the professor record
        const deleteProf = await Professor.destroy({
            where: {
                id: req.params.id, // Replace with the ID of the record you want to delete
            },
        });

        if (deleteProf) {
            res.status(200).send({
                successful: true,
                message: "Successfully deleted professor."
            });
        } else {
            res.status(400).send({
                successful: false,
                message: "Professor not found."
            });
        }
    } catch (err) {
        res.status(500).send({
            successful: false,
            message: err.message
        });
    }
}

const updateProf = async (req, res, next) => {
    try {
        let prof = await Professor.findByPk(req.params.id)
        const { name, email, ProfStatusId } = req.body
        console.log("req.body:", name, email, ProfStatusId)
        console.log("req.body: ", req.body)

        if (!prof) {
            res.status(404).send({
                successful: false,
                message: "Professor not found"
            });
        }

        if (!util.checkMandatoryFields([name, email, ProfStatusId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            })
        }

        // Validate email format
        if (!util.validateEmail(email)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid email format."
            });
        }

        const status = await ProfStatus.findByPk(ProfStatusId);
        if (!status) {
            return res.status(406).json({
                successful: false,
                message: "Professor status not found."
            })
        }

        if (email !== prof.Email) {
            const emailConflict = await Professor.findOne({ where: { email: email } })
            if (emailConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Email already exists. Please use a different email."
                })
            }
        }



        // Log the archive action
        const accountId = '1'; // Example account ID for testing
        const page = 'Professor';
        const details = `Updated Professor: Old; Name: ${prof.Name}, Email: ${prof.Email}, Status: ${prof.Status};;; New; Name: ${name}, Email: ${email}, Status: ${ProfStatusId}`;

        await addHistoryLog(accountId, page, details);

        const updateProf = await prof.update({
            Name: name,
            Email: email,
            ProfStatusId: ProfStatusId
        })

        return res.status(201).json({
            successful: true,
            message: "Successfully updated professor."
        })
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getProfByDept = async (req, res, next) => {
    try {
        const professors = await Professor.findAll({
            attributes: ['id', 'Name'],
            include: [{
                model: Assignation,
                where: { DepartmentId: req.params.id },
                attributes: [],
                required: true
            }]
        });
        if (!professors || professors.length === 0) {
            return res.status(200).send({
                successful: true,
                message: "No professors found for this department",
                count: 0,
                data: []
            });
        }

        return res.status(200).send({
            successful: true,
            message: "Retrieved professors by department",
            count: professors.length,
            data: professors
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

module.exports = {
    addProf,
    getAllProf,
    getProf,
    deleteProf,
    updateProf,
    getProfByDept
}
