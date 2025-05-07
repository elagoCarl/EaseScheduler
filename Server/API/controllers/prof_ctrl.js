const { Professor, ProfStatus, Assignation } = require('../models')
const util = require('../../utils')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env


const addProf = async (req, res, next) => {
    try {
        let professorsToAdd = req.body;

        if (!Array.isArray(professorsToAdd)) {
            professorsToAdd = [professorsToAdd];
        }

        const addedProfs = [];

        // Decode refreshToken from cookies
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

        for (const professorData of professorsToAdd) {
            const { Name, Email, Status } = professorData;

            if (!util.checkMandatoryFields([Name, Email, Status])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            if (!util.validateEmail(Email)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid email format."
                });
            }

            const status = await ProfStatus.findByPk(Status);
            if (!status) {
                return res.status(406).json({
                    successful: false,
                    message: "Professor status not found."
                });
            }

            const existingEmail = await Professor.findOne({ where: { Email } });
            if (existingEmail) {
                return res.status(406).json({
                    successful: false,
                    message: "Email already exists. Please use a different email."
                });
            }

            const newProf = await Professor.create({
                Name,
                Email,
                ProfStatusId: Status
            });

            addedProfs.push(Name);
        }

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
                // attributes: ['Status'] // Fetch only the Status column
            },
            order: [['createdAt', 'DESC']]
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

        // Retrieve the refreshToken from cookies
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

        // Extract the account id from the token payload (adjust based on your token's structure)
        const accountId = decoded.id || decoded.accountId;

        // Log the deletion action
        const page = 'Professor';
        const details = `Deleted Professor record for: ${professor.Name}`;

        await addHistoryLog(accountId, page, details);

        await Assignation.destroy({
            where: {
                ProfessorId: req.params.id
            }
        });

        // Delete the professor record
        const deleteProf = await Professor.destroy({
            where: {
                id: req.params.id,
            },
        });

        if (deleteProf) {
            return res.status(200).send({
                successful: true,
                message: "Successfully deleted professor."
            });
        } else {
            return res.status(400).send({
                successful: false,
                message: "Professor not found."
            });
        }
    } catch (err) {
        return res.status(500).send({
            successful: false,
            message: err.message
        });
    }
};


const updateProf = async (req, res, next) => {
    try {
        let prof = await Professor.findByPk(req.params.id);
        const { name, email, ProfStatusId } = req.body;
        console.log("req.body:", name, email, ProfStatusId);
        console.log("req.body: ", req.body);

        if (!prof) {
            return res.status(404).send({
                successful: false,
                message: "Professor not found"
            });
        }

        if (!util.checkMandatoryFields([name, email, ProfStatusId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
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
            });
        }

        if (email !== prof.Email) {
            const emailConflict = await Professor.findOne({ where: { email: email } });
            if (emailConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Email already exists. Please use a different email."
                });
            }
        }

        // Retrieve the refreshToken from cookies and decode it to get the account ID
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({
                successful: false,
                message: "Unauthorized: refreshToken not found."
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET); // use your secret key from env
        } catch (err) {
            return res.status(403).json({
                successful: false,
                message: "Invalid refreshToken."
            });
        }

        // Extract accountId (adjust property name based on your token payload)
        const accountId = decoded.id || decoded.accountId;

        // Log the update action with details including old and new data
        const page = 'Professor';
        const details = `Updated Professor: Old; Name: ${prof.Name}, Email: ${prof.Email}, Status: ${prof.ProfStatusId};;; New; Name: ${name}, Email: ${email}, Status: ${ProfStatusId}`;
        await addHistoryLog(accountId, page, details);

        // Update professor record
        await prof.update({
            Name: name,
            Email: email,
            ProfStatusId: ProfStatusId
        });

        return res.status(201).json({
            successful: true,
            message: "Successfully updated professor."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

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
