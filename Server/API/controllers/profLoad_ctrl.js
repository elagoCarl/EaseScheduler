const { ProfessorLoad, Professor, SchoolYear } = require('../models');
const util = require('../../utils');
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;

// Add a new professor load
const addProfessorLoad = async (req, res, next) => {
    try {
        let loadsToAdd = req.body;

        if (!Array.isArray(loadsToAdd)) {
            loadsToAdd = [loadsToAdd];
        }

        const addedLoads = [];

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

        for (const loadData of loadsToAdd) {
            const { ProfId, SY_Id, First_Sem_Units, Second_Sem_Units } = loadData;

            if (!util.checkMandatoryFields([ProfId, SY_Id, First_Sem_Units, Second_Sem_Units])) {
                return res.status(400).json({
                    successful: false,
                    message: "All fields are required: Professor ID, School Year ID, First Semester Units, and Second Semester Units."
                });
            }

            // Validate professor exists
            const professor = await Professor.findByPk(ProfId);
            if (!professor) {
                return res.status(406).json({
                    successful: false,
                    message: "Professor not found."
                });
            }

            // Validate school year exists
            const schoolYear = await SchoolYear.findByPk(SY_Id);
            if (!schoolYear) {
                return res.status(406).json({
                    successful: false,
                    message: "School Year not found."
                });
            }

            // Check if this professor already has a load for this school year
            const existingLoad = await ProfessorLoad.findOne({
                where: {
                    ProfId,
                    SY_Id
                }
            });

            if (existingLoad) {
                return res.status(406).json({
                    successful: false,
                    message: `Professor ${professor.Name} already has a load assigned for the school year ${schoolYear.SY_Name}.`
                });
            }

            // Validate units are non-negative integers
            if (First_Sem_Units < 0 || Second_Sem_Units < 0) {
                return res.status(406).json({
                    successful: false,
                    message: "Units cannot be negative."
                });
            }

            const newLoad = await ProfessorLoad.create({
                ProfId,
                SY_Id,
                First_Sem_Units,
                Second_Sem_Units
            });

            addedLoads.push(`${professor.Name} (${schoolYear.SY_Name})`);
        }

        const page = 'ProfessorLoad';
        const details = `Added workload for: ${addedLoads.join(', ')}`;
        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: `Successfully added workload for ${addedLoads.length} professor(s).`
        });

    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

// Get all professor loads
const getAllProfessorLoads = async (req, res, next) => {
    try {
        const loads = await ProfessorLoad.findAll({
            include: [
                {
                    model: Professor,
                    attributes: ['id', 'Name', 'Email']
                },
                {
                    model: SchoolYear,
                    attributes: ['id', 'SY_Name']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        if (!loads || loads.length === 0) {
            return res.status(200).send({
                successful: true,
                message: "No workloads found",
                count: 0,
                data: []
            });
        }

        // Format response for easier consumption
        const formattedLoads = loads.map(load => ({
            id: load.id,
            ProfessorName: load.Professor ? load.Professor.Name : "Unknown",
            ProfessorEmail: load.Professor ? load.Professor.Email : "Unknown",
            SchoolYear: load.SchoolYear ? load.SchoolYear.SY_Name : "Unknown",
            First_Sem_Units: load.First_Sem_Units,
            Second_Sem_Units: load.Second_Sem_Units,
            Total_Units: load.First_Sem_Units + load.Second_Sem_Units,
            ProfId: load.ProfId,
            SY_Id: load.SY_Id
        }));

        return res.status(200).send({
            successful: true,
            message: "Retrieved all professor workloads",
            count: formattedLoads.length,
            data: formattedLoads
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};

// Get a specific professor load by ID
const getProfessorLoad = async (req, res) => {
    try {
        const load = await ProfessorLoad.findByPk(req.params.id, {
            include: [
                {
                    model: Professor,
                    attributes: ['id', 'Name', 'Email']
                },
                {
                    model: SchoolYear,
                    attributes: ['id', 'SY_Name']
                }
            ]
        });

        if (!load) {
            return res.status(404).json({
                successful: false,
                message: "Workload not found"
            });
        }

        // Format response for easier consumption
        const formattedLoad = {
            id: load.id,
            ProfessorName: load.Professor ? load.Professor.Name : "Unknown",
            ProfessorEmail: load.Professor ? load.Professor.Email : "Unknown",
            SchoolYear: load.SchoolYear ? load.SchoolYear.SY_Name : "Unknown",
            First_Sem_Units: load.First_Sem_Units,
            Second_Sem_Units: load.Second_Sem_Units,
            Total_Units: load.First_Sem_Units + load.Second_Sem_Units,
            ProfId: load.ProfId,
            SY_Id: load.SY_Id,
            Professor: load.Professor,
            SchoolYear: load.SchoolYear
        };

        res.status(200).json({
            successful: true,
            message: "Workload retrieved successfully",
            data: formattedLoad
        });
    } catch (error) {
        res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

// Get workloads for a specific professor
const getProfessorLoadsById = async (req, res) => {
    try {
        const loads = await ProfessorLoad.findAll({
            where: {
                ProfId: req.params.id
            },
            include: [
                {
                    model: SchoolYear,
                    attributes: ['id', 'SY_Name']
                }
            ],
            order: [[{ model: SchoolYear }, 'SY_Name', 'DESC']]
        });

        if (!loads || loads.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No workloads found for this professor",
                count: 0,
                data: []
            });
        }

        // Format response for easier consumption
        const formattedLoads = loads.map(load => ({
            id: load.id,
            SchoolYear: load.SchoolYear ? load.SchoolYear.SY_Name : "Unknown",
            First_Sem_Units: load.First_Sem_Units,
            Second_Sem_Units: load.Second_Sem_Units,
            Total_Units: load.First_Sem_Units + load.Second_Sem_Units,
            ProfId: load.ProfId,
            SY_Id: load.SY_Id
        }));

        return res.status(200).json({
            successful: true,
            message: "Retrieved all workloads for professor",
            count: formattedLoads.length,
            data: formattedLoads
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

// Get all loads for a specific school year
const getLoadsBySchoolYear = async (req, res) => {
    try {
        const loads = await ProfessorLoad.findAll({
            where: {
                SY_Id: req.params.id
            },
            include: [
                {
                    model: Professor,
                    attributes: ['id', 'Name', 'Email']
                }
            ],
            order: [[{ model: Professor }, 'Name', 'ASC']]
        });

        if (!loads || loads.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No workloads found for this school year",
                count: 0,
                data: []
            });
        }

        // Format response for easier consumption
        const formattedLoads = loads.map(load => ({
            id: load.id,
            ProfessorName: load.Professor ? load.Professor.Name : "Unknown",
            ProfessorEmail: load.Professor ? load.Professor.Email : "Unknown",
            First_Sem_Units: load.First_Sem_Units,
            Second_Sem_Units: load.Second_Sem_Units,
            Total_Units: load.First_Sem_Units + load.Second_Sem_Units,
            ProfId: load.ProfId,
            SY_Id: load.SY_Id
        }));

        return res.status(200).json({
            successful: true,
            message: "Retrieved all workloads for school year",
            count: formattedLoads.length,
            data: formattedLoads
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

// Delete a professor load
const deleteProfessorLoad = async (req, res, next) => {
    try {
        // Find the load before deletion (to log details)
        const load = await ProfessorLoad.findOne({
            where: {
                id: req.params.id
            },
            include: [
                {
                    model: Professor,
                    attributes: ['Name']
                },
                {
                    model: SchoolYear,
                    attributes: ['SY_Name']
                }
            ]
        });

        if (!load) {
            return res.status(400).send({
                successful: false,
                message: "Workload not found."
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
        const page = 'ProfessorLoad';
        const details = `Deleted workload for Professor: ${load.Professor?.Name || 'Unknown'}, School Year: ${load.SchoolYear?.SY_Name || 'Unknown'}`;
        await addHistoryLog(accountId, page, details);

        // Delete the load record
        const deleteLoad = await ProfessorLoad.destroy({
            where: {
                id: req.params.id,
            },
        });

        if (deleteLoad) {
            return res.status(200).send({
                successful: true,
                message: "Successfully deleted workload."
            });
        } else {
            return res.status(400).send({
                successful: false,
                message: "Workload not found."
            });
        }
    } catch (err) {
        return res.status(500).send({
            successful: false,
            message: err.message
        });
    }
};

// Update a professor load
const updateProfessorLoad = async (req, res, next) => {
    try {
        let load = await ProfessorLoad.findByPk(req.params.id, {
            include: [
                {
                    model: Professor,
                    attributes: ['Name']
                },
                {
                    model: SchoolYear,
                    attributes: ['SY_Name']
                }
            ]
        });

        const { First_Sem_Units, Second_Sem_Units } = req.body;

        if (!load) {
            return res.status(404).send({
                successful: false,
                message: "Workload not found"
            });
        }

        if (!util.checkMandatoryFields([First_Sem_Units, Second_Sem_Units])) {
            return res.status(400).json({
                successful: false,
                message: "First Semester Units and Second Semester Units are required."
            });
        }

        // Validate units are non-negative integers
        if (First_Sem_Units < 0 || Second_Sem_Units < 0) {
            return res.status(406).json({
                successful: false,
                message: "Units cannot be negative."
            });
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
        const page = 'ProfessorLoad';
        const details = `Updated workload for Professor: ${load.Professor?.Name || 'Unknown'}, School Year: ${load.SchoolYear?.SY_Name || 'Unknown'}, Old Units: [1st Sem: ${load.First_Sem_Units}, 2nd Sem: ${load.Second_Sem_Units}], New Units: [1st Sem: ${First_Sem_Units}, 2nd Sem: ${Second_Sem_Units}]`;
        await addHistoryLog(accountId, page, details);

        // Update load record
        await load.update({
            First_Sem_Units,
            Second_Sem_Units
        });

        return res.status(201).json({
            successful: true,
            message: "Successfully updated workload."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const getProfLoadByProfAndSY = async (req, res) => {
    try {
        const { profId, syId } = req.body;

        // Validate parameters
        if (!profId || !syId) {
            return res.status(400).json({
                successful: false,
                message: "Both Professor ID and School Year ID are required in the request body."
            });
        }

        // Find the professor to include their name in response
        const professor = await Professor.findByPk(profId);
        if (!professor) {
            return res.status(404).json({
                successful: false,
                message: "Professor not found."
            });
        }

        // Find the school year to include its name in response
        const schoolYear = await SchoolYear.findByPk(syId);
        if (!schoolYear) {
            return res.status(404).json({
                successful: false,
                message: "School Year not found."
            });
        }

        // Find the load record
        const load = await ProfessorLoad.findOne({
            where: {
                ProfId: profId,
                SY_Id: syId
            }
        });

        if (!load) {
            return res.status(404).json({
                successful: true, // Still successful request, just no data found
                message: `No workload found for Professor ${professor.Name} in School Year ${schoolYear.SY_Name}`,
                data: null
            });
        }

        // Format the response
        const formattedLoad = {
            id: load.id,
            ProfessorName: professor.Name,
            ProfessorEmail: professor.Email,
            SchoolYear: schoolYear.SY_Name,
            First_Sem_Units: load.First_Sem_Units,
            Second_Sem_Units: load.Second_Sem_Units,
            Total_Units: load.First_Sem_Units + load.Second_Sem_Units,
            ProfId: load.ProfId,
            SY_Id: load.SY_Id
        };

        return res.status(200).json({
            successful: true,
            message: `Retrieved workload for Professor ${professor.Name} in School Year ${schoolYear.SY_Name}`,
            data: formattedLoad
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};
module.exports = {
    addProfessorLoad,
    getAllProfessorLoads,
    getProfessorLoad,
    getProfessorLoadsById,
    getLoadsBySchoolYear,
    deleteProfessorLoad,
    updateProfessorLoad,
    getProfLoadByProfAndSY
};