const { SchoolYear } = require('../models');
const util = require('../../utils');
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;

// Add a new school year
const addSchoolYear = async (req, res, next) => {
    try {
        let schoolYearsToAdd = req.body;

        if (!Array.isArray(schoolYearsToAdd)) {
            schoolYearsToAdd = [schoolYearsToAdd];
        }

        const addedSchoolYears = [];

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
            decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
        } catch (err) {
            return res.status(403).json({
                successful: false,
                message: "Invalid refreshToken."
            });
        }

        const accountId = decoded.id || decoded.accountId;

        for (const schoolYearData of schoolYearsToAdd) {
            const { SY_Name } = schoolYearData;

            if (!util.checkMandatoryFields([SY_Name])) {
                return res.status(400).json({
                    successful: false,
                    message: "School Year Name is missing."
                });
            }

            const existingSchoolYear = await SchoolYear.findOne({ where: { SY_Name } });
            if (existingSchoolYear) {
                return res.status(406).json({
                    successful: false,
                    message: "School Year already exists. Please use a different name."
                });
            }

            const newSchoolYear = await SchoolYear.create({
                SY_Name
            });

            addedSchoolYears.push(SY_Name);
        }

        const page = 'SchoolYear';
        const details = `Added School Year${addedSchoolYears.length > 1 ? 's' : ''}: ${addedSchoolYears.join(', ')}`;
        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: `Successfully added ${addedSchoolYears.length} school year(s).`
        });

    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

// Get all school years
const getAllSchoolYears = async (req, res, next) => {
    try {
        const schoolYears = await SchoolYear.findAll({
            order: [['createdAt', 'DESC']]
        });

        if (!schoolYears || schoolYears.length === 0) {
            return res.status(200).send({
                successful: true,
                message: "No school years found",
                count: 0,
                data: []
            });
        }

        return res.status(200).send({
            successful: true,
            message: "Retrieved all school years",
            count: schoolYears.length,
            data: schoolYears
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

// Get a specific school year by ID
const getSchoolYear = async (req, res) => {
    try {
        const schoolYear = await SchoolYear.findByPk(req.params.id);

        if (!schoolYear) {
            return res.status(404).json({
                successful: false,
                message: "School Year not found"
            });
        }

        res.status(200).json({
            successful: true,
            message: "School Year retrieved successfully",
            data: schoolYear
        });
    } catch (error) {
        res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

// Delete a school year
const deleteSchoolYear = async (req, res, next) => {
    try {
        // Find the school year before deletion (to log the name)
        const schoolYear = await SchoolYear.findOne({
            where: {
                id: req.params.id
            },
        });

        if (!schoolYear) {
            return res.status(400).send({
                successful: false,
                message: "School Year not found."
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
            decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
        } catch (err) {
            return res.status(403).json({
                successful: false,
                message: "Invalid refreshToken."
            });
        }

        const accountId = decoded.id || decoded.accountId;

        // Log the deletion action
        const page = 'SchoolYear';
        const details = `Deleted School Year: ${schoolYear.SY_Name}`;
        await addHistoryLog(accountId, page, details);

        // Delete the school year record
        const deleteSchoolYear = await SchoolYear.destroy({
            where: {
                id: req.params.id,
            },
        });

        if (deleteSchoolYear) {
            return res.status(200).send({
                successful: true,
                message: "Successfully deleted school year."
            });
        } else {
            return res.status(400).send({
                successful: false,
                message: "School Year not found."
            });
        }
    } catch (err) {
        return res.status(500).send({
            successful: false,
            message: err.message
        });
    }
};

// Update a school year
const updateSchoolYear = async (req, res, next) => {
    try {
        let schoolYear = await SchoolYear.findByPk(req.params.id);
        const { SY_Name } = req.body;

        if (!schoolYear) {
            return res.status(404).send({
                successful: false,
                message: "School Year not found"
            });
        }

        if (!util.checkMandatoryFields([SY_Name])) {
            return res.status(400).json({
                successful: false,
                message: "School Year Name is missing."
            });
        }

        // Check if the updated name conflicts with an existing one
        if (SY_Name !== schoolYear.SY_Name) {
            const nameConflict = await SchoolYear.findOne({ where: { SY_Name } });
            if (nameConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "School Year already exists. Please use a different name."
                });
            }
        }

        // Retrieve and decode the token
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

        // Log the update action
        const page = 'SchoolYear';
        const details = `Updated School Year: Old: ${schoolYear.SY_Name}; New: ${SY_Name}`;
        await addHistoryLog(accountId, page, details);

        // Update school year record
        await schoolYear.update({
            SY_Name: SY_Name
        });

        return res.status(201).json({
            successful: true,
            message: "Successfully updated school year."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

// Get current/active school year
const getCurrentSchoolYear = async (req, res) => {
    try {
        // Assuming the most recently created school year is the current one
        // You might want to add a flag in your model to explicitly mark the current one
        const currentSchoolYear = await SchoolYear.findOne({
            order: [['createdAt', 'DESC']]
        });

        if (!currentSchoolYear) {
            return res.status(404).json({
                successful: false,
                message: "No school years found"
            });
        }

        res.status(200).json({
            successful: true,
            message: "Current school year retrieved successfully",
            data: currentSchoolYear
        });
    } catch (error) {
        res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

module.exports = {
    addSchoolYear,
    getAllSchoolYears,
    getSchoolYear,
    deleteSchoolYear,
    updateSchoolYear,
    getCurrentSchoolYear
};