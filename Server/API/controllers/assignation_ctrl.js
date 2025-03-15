const { Assignation, Course, Professor, Department, ProfStatus } = require('../models');
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

        for (let assignation of assignations) {
            const { School_Year, Semester, CourseId, ProfessorId, DepartmentId } = assignation;

            // Check mandatory fields
            if (!util.checkMandatoryFields([School_Year, Semester, CourseId, ProfessorId, DepartmentId])) {
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

            // Validate Professor
            const professor = await Professor.findByPk(ProfessorId);
            if (!professor) {
                return res.status(404).json({ successful: false, message: "Professor not found." });
            }

            // Validate Department
            const department = await Department.findByPk(DepartmentId);
            if (!department) {
                return res.status(404).json({ successful: false, message: "Department not found." });
            }

            // Check for duplicate assignation based on schedule
            const existingAssignation = await Assignation.findOne({
                where: { School_Year, Semester, CourseId, ProfessorId, DepartmentId },
            });

            if (existingAssignation) {
                return res.status(400).json({
                    successful: false,
                    message: "An assignation with the same details already exists."
                });
            }

            // Get professor's status to check unit limits
            const status = await ProfStatus.findByPk(professor.ProfStatusId);
            if (!status) {
                return res.status(404).json({ successful: false, message: "Professor status not found." });
            }

            // Calculate new total units
            const unitsToAdd = course.Units;
            const newTotalUnits = professor.Total_units + unitsToAdd;

            // Check that the total new units will not exceed the limit
            if (isExceedingUnitLimit(status.Max_units, newTotalUnits)) {
                return res.status(400).json({
                    successful: false,
                    message: `Professor ${professor.Name} would exceed the maximum allowed units (${status.Max_units}) with this assignation.`
                });
            }

            // Update professor's Total_units with the new calculated value
            await professor.update({ Total_units: newTotalUnits });

            // Create Assignation
            const newAssignation = await Assignation.create({
                School_Year,
                Semester,
                CourseId,
                ProfessorId,
                DepartmentId,
            });

            createdAssignations.push(newAssignation);
        }

        // If no assignations were created, return an error
        if (createdAssignations.length === 0) {
            return res.status(400).json({
                successful: false,
                message: "No assignations were created. Check for missing fields, duplicates, or professor unit limits.",
            });
        }

        return res.status(201).json({
            successful: true,
            message: `${createdAssignations.length} assignation(s) created successfully.`,
            data: createdAssignations,
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
        const { School_Year, Semester, CourseId, ProfessorId, DepartmentId } = req.body;

        // Check mandatory fields
        if (!util.checkMandatoryFields([School_Year, Semester, CourseId, ProfessorId, DepartmentId])) {
            return res.status(400).json({ successful: false, message: "A mandatory field is missing." });
        }

        // Find Assignation
        const assignation = await Assignation.findByPk(id);
        if (!assignation) {
            return res.status(404).json({ successful: false, message: "Assignation not found." });
        }

        // Validate related models
        const course = await Course.findByPk(CourseId);
        if (!course) return res.status(404).json({ successful: false, message: "Course not found." });

        const professor = await Professor.findByPk(ProfessorId);
        if (!professor) return res.status(404).json({ successful: false, message: "Professor not found." });

        const department = await Department.findByPk(DepartmentId);
        if (!department) return res.status(404).json({ successful: false, message: "Department not found." });

        // Check if the assignation already exists
        const existingAssignation = await Assignation.findOne({
            where: {
                School_Year,
                Semester,
                CourseId,
                ProfessorId,
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

        // Get professor's status to check unit limits
        const status = await ProfStatus.findByPk(professor.ProfStatusId);
        if (!status) {
            return res.status(404).json({ successful: false, message: "Professor status not found." });
        }

        // Calculate unit changes
        let currentProfessorUnitChange = 0;

        // If changing to a new professor
        if (assignation.ProfessorId !== ProfessorId) {
            // New professor gets additional units
            currentProfessorUnitChange = course.Units;

            // Handle old professor's units (will be done later in the code)
        }
        // If same professor but different course
        else if (assignation.CourseId !== CourseId && oldCourse) {
            // Remove old course units and add new course units
            currentProfessorUnitChange = course.Units - oldCourse.Units;
        }

        // Calculate new total units for current professor
        const newTotalUnits = professor.Total_units + currentProfessorUnitChange;

        // Check that the total new units will not exceed the limit for the new/current professor
        if (currentProfessorUnitChange > 0 && isExceedingUnitLimit(status.Max_units, newTotalUnits)) {
            return res.status(400).json({
                successful: false,
                message: `Professor ${professor.Name} would exceed the maximum allowed units (${status.Max_units}) with this assignation.`
            });
        }

        // Handle old professor units if professor is changing
        if (assignation.ProfessorId !== ProfessorId) {
            const oldProfessor = await Professor.findByPk(assignation.ProfessorId);
            if (oldProfessor) {
                // Get old course
                const oldCourseForUnitCalc = oldCourse || course;

                // Update old professor's units
                const oldProfNewUnits = oldProfessor.Total_units - oldCourseForUnitCalc.Units;
                await oldProfessor.update({ Total_units: Math.max(0, oldProfNewUnits) });
            }
        }
        // Handle unit update if same professor but course changed
        else if (assignation.CourseId !== CourseId && oldCourse) {
            // Units adjustment will be handled in the update below
        }

        // Update current professor's total units if needed
        if (currentProfessorUnitChange !== 0) {
            await professor.update({ Total_units: newTotalUnits });
        }

        // Update Assignation
        await assignation.update({
            School_Year,
            Semester,
            CourseId,
            ProfessorId,
            DepartmentId,
        });

        return res.status(200).json({
            successful: true,
            message: "Assignation updated successfully.",
            data: assignation,
        });
    } catch (error) {
        console.error("Error in updateAssignation:", error);

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
                { model: Course, attributes: ['Code', 'Description', 'Units'] },
                { model: Professor, attributes: ['Name', 'Email', 'Total_units'] },
                { model: Department, attributes: ['Name'] },
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
                { model: Course, attributes: ['Code', 'Description', 'Units'] },
                { model: Professor, attributes: ['Name', 'Email', 'Total_units'] },
                { model: Department, attributes: ['Name'] },
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
            // Optionally, include associated models if needed:
            // include: [models.Professor, models.Course, models.Departmet, models.Schedule]
        });

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
        n
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

// Delete Assignation by ID
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

        const { CourseId, ProfessorId } = assignation;

        // Get Course and Professor
        const course = await Course.findByPk(CourseId);
        const professor = await Professor.findByPk(ProfessorId);

        // Delete the Assignation
        await assignation.destroy();

        // Update professor's Total_units if professor exists
        if (professor) {
            const decrementedUnit = professor.Total_units - course.Units;
            await professor.update({ Total_units: Math.max(0, decrementedUnit) });
        }

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

module.exports = {
    addAssignation,
    updateAssignation,
    getAssignation,
    getAllAssignations,
    deleteAssignation,
    getAllAssignationsByDept
};



