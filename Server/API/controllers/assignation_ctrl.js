const { Assignation, Course, Professor, Department } = require('../models');
const { Op } = require('sequelize');
const util = require('../../utils');

const maxProfessorUnits = 20; // Max units a professor can handle

// Add Assignation
const { ValidationError } = require('sequelize'); // Import Sequelize's ValidationError

const addAssignation = async (req, res, next) => {
    try {
        let assignations = req.body;

        if (!Array.isArray(assignations)) {
            assignations = [assignations];
        }

        let createdAssignations = [];

        for (let assignation of assignations) {
            const { School_Year, Semester, Block, CourseId, ProfessorId, DepartmentId } = assignation;

            // Use util to check mandatory fields
            if (!util.checkMandatoryFields([School_Year, Semester, Block, CourseId, ProfessorId, DepartmentId])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing.",
                });
            }

            // Validate Course
            const course = await Course.findByPk(CourseId);
            if (!course) continue; // Skip if Course is not found

            // Validate Professor
            const professor = await Professor.findByPk(ProfessorId);
            if (!professor) continue; // Skip if Professor is not found

            // Validate Department
            const department = await Department.findByPk(DepartmentId);
            if (!department) continue; // Skip if Department is not found

            // Check for duplicate assignation based on schedule
            const existingAssignation = await Assignation.findOne({
                where: { School_Year, Semester, Block, CourseId, ProfessorId, DepartmentId },
            });

            if (existingAssignation) continue; // Skip if duplicate exists

            // Ensure CourseProf association exists
            const courseProfExists = await course.hasCourseProf(professor);
            if (!courseProfExists) {
                await course.addCourseProf(professor);
            }

            // Update professor's Total_units
            const newTotalUnits = professor.Total_units + course.Units;
            await professor.update({ Total_units: newTotalUnits });

            // Create Assignation
            const newAssignation = await Assignation.create({
                School_Year,
                Semester,
                Block,
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
                message: "No assignations were created. Check for missing fields or duplicates.",
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
        const { School_Year, Semester, Block, CourseId, ProfessorId, DepartmentId } = req.body;

        // Check mandatory fields
        if (!util.checkMandatoryFields([School_Year, Semester, Block, CourseId, ProfessorId, DepartmentId])) {
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

        // Check professor's total units
        const existingAssignations = await Assignation.findAll({
            where: { ProfessorId, id: { [Op.ne]: id } },
            include: [{ model: Course, attributes: ['Units'] }],
        });
        const totalUnits = existingAssignations.reduce(
            (sum, assign) => sum + (assign.Course ? assign.Course.Units : 0),
            0
        );

        // Check if the assignation already exists
        const existingAssignation = await Assignation.findOne({
            where: { 
                School_Year, 
                Semester, 
                Block, 
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
        
        if (totalUnits + course.Units > maxProfessorUnits) {
            return res.status(400).json({ successful: false, message: `Updating this assignation would overload the professor. Maximum allowed units: ${maxProfessorUnits}.` });
        }

        // Ensure CourseProf association for the new professor
        const courseProfExists = await course.hasCourseProf(professor);
        if (!courseProfExists) {
            await course.addCourseProf(professor);
        }

        // Remove old CourseProf association if applicable
        if (assignation.ProfessorId !== ProfessorId) {
            const oldProfessor = await Professor.findByPk(assignation.ProfessorId);
            const otherAssignations = await Assignation.findAll({
                where: { ProfessorId: assignation.ProfessorId, CourseId },
            });
            if (otherAssignations.length === 0) {
                await course.removeCourseProf(oldProfessor);
            }
        }


        
        // Update Assignation
        await assignation.update({
            School_Year,
            Semester,
            Block,
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
        next(error);
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

        // Update professor's Total_units
        const decrementedUnit  = professor.Total_units - course.Units;
        await professor.update({ Total_units: decrementedUnit });
        
        // Check if CourseProf association needs to be removed
        const otherAssignations = await Assignation.findAll({
            where: { ProfessorId, CourseId },
        });
        if (otherAssignations.length === 0) {
            const course = await Course.findByPk(CourseId);
            const professor = await Professor.findByPk(ProfessorId);
            await course.removeCourseProf(professor);
        }
        return res.status(200).json({
            successful: true,
            message: "Assignation deleted successfully.",
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
};



