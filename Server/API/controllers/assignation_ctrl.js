const { Assignation, Course, Professor, Department, ProfStatus, RoomType, Room } = require('../models');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');
const { Op, ValidationError } = require('sequelize');
const util = require('../../utils');

const isExceedingUnitLimit = (Max_units, newTotalUnits) => {
    return newTotalUnits > (Max_units || 0);
}

const addAssignation = async (req, res, next) => {
    try {
        let assignations = req.body;

        if (!Array.isArray(assignations)) {
            assignations = [assignations];
        }

        let createdAssignations = [];
        let warningMessage = null;

        for (let assignation of assignations) {
            let { Semester, CourseId, ProfessorId, DepartmentId } = assignation;
            Semester = parseInt(Semester, 10); // Ensure Semester is an integer
            // Check mandatory fields - note ProfessorId can be null based on the model
            if (!util.checkMandatoryFields([Semester, CourseId, DepartmentId])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing.",
                });
            }

            // Validate Course
            const course = await Course.findByPk(CourseId);
            if (!course) {
                return res.status(404).json({ successful: false, message: "Course not found." });
            }

            // Validate Department
            const department = await Department.findByPk(DepartmentId);
            if (!department) {
                return res.status(404).json({ successful: false, message: "Department not found." });
            }

            if (Semester < 1 || Semester > 2) {
                return res.status(400).json({ successful: false, message: "Semester must be 1 or 2." });
            }

            // Validate Professor if provided
            let professor = null;
            if (ProfessorId) {
                professor = await Professor.findByPk(ProfessorId);
                if (!professor) {
                    return res.status(404).json({ successful: false, message: "Professor not found." });
                }
            }

            // Check for duplicate assignation based on schedule
            const existingAssignation = await Assignation.findOne({
                where: {
                    Semester,
                    CourseId,
                    DepartmentId,
                    ProfessorId: ProfessorId || null
                },
            });

            if (existingAssignation) {
                return res.status(400).json({
                    successful: false,
                    message: "An assignation with the same details already exists."
                });
            }

            const existAssignationSem = await Assignation.findOne({
                where: {
                    CourseId,
                    DepartmentId
                },
            });
            if (existAssignationSem && existAssignationSem.Semester !== Semester) {
                return res.status(400).json({
                    successful: false,
                    message: "The course is already assigned to another semester."
                })
            }

            // If professor is provided, check unit limits
            if (professor) {
                // Get professor's status to check unit limits
                const status = await ProfStatus.findByPk(professor.ProfStatusId);
                if (!status) {
                    return res.status(404).json({ successful: false, message: "Professor status not found." });
                }
                if (Semester === 1) {
                    // Calculate new total units
                    const unitsToAdd = course.Units;
                    const newTotalUnits = professor.FirstSemUnits + unitsToAdd;

                    // Check if the total new units will exceed the limit
                    if (newTotalUnits > status.Max_units) {
                        // Instead of returning an error, set a warning message
                        warningMessage = `Professor ${professor.Name} is overloaded (${newTotalUnits}/${status.Max_units} units).`;
                    }

                    // Update professor's units with the new calculated value
                    await professor.update({ FirstSemUnits: newTotalUnits });
                }
                if (Semester === 2) {
                    // Calculate new total units
                    const unitsToAdd = course.Units;
                    const newTotalUnits = professor.SecondSemUnits + unitsToAdd;

                    // Check if the total new units will exceed the limit
                    if (newTotalUnits > status.Max_units) {
                        // Instead of returning an error, set a warning message
                        warningMessage = `Professor ${professor.Name} is overloaded (${newTotalUnits}/${status.Max_units} units).`;
                    }

                    // Update professor's units with the new calculated value
                    await professor.update({ SecondSemUnits: newTotalUnits });
                }
            }

            // Create Assignation
            const assignationData = {
                Semester,
                CourseId,
                DepartmentId,
            };

            // Add ProfessorId if it was provided
            if (ProfessorId) {
                assignationData.ProfessorId = ProfessorId;
            }

            const newAssignation = await Assignation.create(assignationData);

            createdAssignations.push(newAssignation);
        }

        // If no assignations were created, return an error
        if (createdAssignations.length === 0) {
            return res.status(400).json({
                successful: false,
                message: "No assignations were created. Check for missing fields or duplicates.",
            });
        }

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
        const page = 'Assignation';
        const details = `Added Assignation ID(s): ${createdAssignations.map(a => a.id).join(', ')}`;
        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: `${createdAssignations.length} assignation(s) created successfully.`,
            data: createdAssignations,
            warning: warningMessage
        });

    } catch (error) {
        console.error("Error in addAssignation:", error);

        if (error instanceof ValidationError) {
            return res.status(400).json({
                successful: false,
                message: "Validation Error: One or more fields failed validation.",
                errors: error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                })),
            });
        }

        return res.status(500).json({
            successful: false,
            message: "An unexpected error occurred while creating assignations.",
            error: error.message,
        });
    }
};

// Update Assignation by ID
const updateAssignation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Semester, CourseId, ProfessorId, DepartmentId } = req.body;
        let warningMessage = null;

        // Check mandatory fields - ProfessorId can be null based on the model
        if (!util.checkMandatoryFields([Semester, CourseId, DepartmentId])) {
            return res.status(400).json({ successful: false, message: "A mandatory field is missing." });
        }

        // Find Assignation
        const assignation = await Assignation.findByPk(id);
        if (!assignation) {
            return res.status(404).json({ successful: false, message: "Assignation not found." });
        }

        if (Semester < 1 || Semester > 2) {
            return res.status(400).json({ successful: false, message: "Semester must be 1 or 2." });
        }
        // Validate related models
        const course = await Course.findByPk(CourseId);
        if (!course) return res.status(404).json({ successful: false, message: "Course not found." });

        const department = await Department.findByPk(DepartmentId);
        if (!department) return res.status(404).json({ successful: false, message: "Department not found." });


        // Validate Professor if provided
        let professor = null;
        if (ProfessorId) {
            professor = await Professor.findByPk(ProfessorId);
            if (!professor) {
                return res.status(404).json({ successful: false, message: "Professor not found." });
            }
        }

        // Check if the assignation already exists
        const existingAssignation = await Assignation.findOne({
            where: {
                Semester,
                CourseId,
                DepartmentId,
                ProfessorId: ProfessorId || null,
                id: { [Op.ne]: id } // Exclude current assignation
            }
        });

        if (existingAssignation) {
            return res.status(400).json({
                successful: false,
                message: "An assignation with the same details already exists."
            });
        }

        // Get old course information if course is changing
        let oldCourse = null;
        if (assignation.CourseId !== CourseId) {
            oldCourse = await Course.findByPk(assignation.CourseId);
        }

        // Handle professor unit calculations
        let currentProfessorUnitChange = 0;

        // Get old professor if exists
        let oldProfessor = null;
        if (assignation.ProfessorId) {
            oldProfessor = await Professor.findByPk(assignation.ProfessorId);
        }

        // Unit calculation logic
        if (professor) {
            // If changing from null professor to a professor
            if (!assignation.ProfessorId) {
                currentProfessorUnitChange = course.Units;
            }
            // If changing to a new professor
            else if (assignation.ProfessorId !== ProfessorId) {
                // New professor gets additional units
                currentProfessorUnitChange = course.Units;
            }
            // If same professor but different course
            else if (assignation.CourseId !== CourseId && oldCourse) {
                // Remove old course units and add new course units
                currentProfessorUnitChange = course.Units - oldCourse.Units;
            }

            // Get professor's status to check unit limits
            const status = await ProfStatus.findByPk(professor.ProfStatusId);
            if (!status) {
                return res.status(404).json({ successful: false, message: "Professor status not found." });
            }

            // Calculate new total units for current professor
            const newTotalUnits = professor.Total_units + currentProfessorUnitChange;

            // Check if the total new units will exceed the limit for the new/current professor
            if (currentProfessorUnitChange > 0 && newTotalUnits > status.Max_units) {
                // Add warning message instead of blocking the update
                warningMessage = `Professor ${professor.Name} is overloaded (${newTotalUnits}/${status.Max_units} units).`;
            }

            // Update current professor's total units if needed
            if (currentProfessorUnitChange !== 0) {
                await professor.update({ Total_units: newTotalUnits });
            }
        }

        // Handle old professor units if professor is changing or being removed
        if (oldProfessor && (ProfessorId !== assignation.ProfessorId || ProfessorId === null)) {
            // Get old course
            const oldCourseForUnitCalc = oldCourse || course;

            // Update old professor's units
            const oldProfNewUnits = oldProfessor.Total_units - oldCourseForUnitCalc.Units;
            await oldProfessor.update({ Total_units: Math.max(0, oldProfNewUnits) });
        }

        // Update Assignation
        const updateData = {
            Semester,
            CourseId,
            DepartmentId,
        };

        // Add ProfessorId if it was provided (can be null)
        updateData.ProfessorId = ProfessorId;

        await assignation.update(updateData);

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
        const page = 'Assignation';
        const details = `Updated Assignation ID: ${id}, Course: ${CourseId}, Prof: ${ProfessorId || 'None'}`;
        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: "Assignation updated successfully.",
            data: assignation,
            warning: warningMessage
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                successful: false,
                message: "Validation Error: One or more fields failed validation.",
                errors: error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                })),
            });
        }

        return res.status(500).json({
            successful: false,
            message: "An unexpected error occurred while updating the assignation.",
            error: error.message,
        });
    }
};

// Get a specific Assignation by ID
const getAssignation = async (req, res, next) => {
    try {
        const { id } = req.params;

        const assignation = await Assignation.findByPk(id, {
            include: [
                {
                    model: Course,
                    attributes: ['Code', 'Description', 'Units'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                { model: Professor, attributes: ['Name', 'Email', 'FirstSemUnits', 'SecondSemUnits'] },
                { model: Department, attributes: ['Name'] },
                {
                    model: RoomType,
                    attributes: ['id', 'Type']
                }
            ],
        });

        if (!assignation) {
            return res.status(404).json({ successful: false, message: "Assignation not found." });
        }

        return res.status(200).json({
            successful: true,
            data: assignation,
        });
    } catch (error) {
        next(error);
    }
};

// Get all Assignations
const getAllAssignations = async (req, res, next) => {
    try {
        const assignations = await Assignation.findAll({
            include: [
                {
                    model: Course, attributes: ['Code', 'Description', 'Units'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                { model: Professor, attributes: ['Name', 'Email', 'FirstSemUnits', 'SecondSemUnits'] },
                { model: Department, attributes: ['Name'] }
            ],
        });

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
        next(error);
    }
};

const getAllAssignationsByDept = async (req, res, next) => {
    try {
        const departmentId = req.params.id;
        if (!departmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department id is required.",
            });
        }

        const assignations = await Assignation.findAll({
            where: { DepartmentId: departmentId },
            include: [
                {
                    model: Course,
                    attributes: ['Code', 'Description', 'Units'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                }
            ]
        });

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const getAllAssignationsByDeptInclude = async (req, res, next) => {
    try {
        const departmentId = req.params.id;
        if (!departmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department id is required.",
            });
        }

        const assignations = await Assignation.findAll({
            where: { DepartmentId: departmentId },
            include: [
                {
                    model: Course, attributes: ['Code', 'Description', 'Units', 'Type', 'Duration'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                { model: Professor, attributes: ['Name', 'Email', 'FirstSemUnits', 'SecondSemUnits'] },
                { model: Department, attributes: ['Name'] }
            ],
        });

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
        next(error);
    }
};

const deleteAssignation = async (req, res, next) => {
    try {
        const { id } = req.params;

        const assignation = await Assignation.findByPk(id, {
            include: [
                { model: Course, attributes: ['Units'] },
                { model: Professor },
            ],
        });
        if (!assignation) {
            return res.status(404).json({ successful: false, message: "Assignation not found." });
        }

        const oldA = JSON.stringify(assignation);

        const { CourseId, ProfessorId } = assignation;

        // Get Course and Professor
        const course = await Course.findByPk(CourseId);

        // Update professor's units if professor exists
        if (ProfessorId) {
            const professor = await Professor.findByPk(ProfessorId);
            if (professor) {
                if (assignation.Semester === 1) {
                    const decrementedUnit = professor.FirstSemUnits - course.Units;
                    await professor.update({ FirstSemUnits: Math.max(0, decrementedUnit) });
                }
                if (assignation.Semester === 2) {
                    const decrementedUnit = professor.SecondSemUnits - course.Units;
                    await professor.update({ SecondSemUnits: Math.max(0, decrementedUnit) });
                }
            }
        }
        await assignation.destroy();

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
        const page = 'Assignation';
        const details = `Deleted Assignation ID: ${id}, Course: ${assignation.CourseId}, Prof: ${assignation.ProfessorId || 'None'}`;
        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: "Assignation deleted successfully.",
        });
    } catch (error) {
        console.error("Error in deleteAssignation:", error);
        return res.status(500).json({
            successful: false,
            message: "An unexpected error occurred while deleting the assignation.",
            error: error.message,
        });
    }
};

// Get assignments with room schedules
const getAssignationsWithSchedules = async (req, res, next) => {
    try {
        const assignations = await Assignation.findAll({
            include: [
                {
                    model: Course, attributes: ['Code', 'Description', 'Units'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                { model: Professor, attributes: ['Name', 'Email', 'FirstSemUnits', 'SecondSemUnits'] },
                { model: Department, attributes: ['Name'] },
                {
                    model: Room,
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ],
                    through: {
                        attributes: ['Day', 'StartTime', 'EndTime']
                    }
                }
            ],
        });

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addAssignation,
    updateAssignation,
    getAssignation,
    getAllAssignations,
    deleteAssignation,
    getAllAssignationsByDept,
    getAllAssignationsByDeptInclude,
    getAssignationsWithSchedules
};