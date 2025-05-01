const { Program, Course, CourseProg } = require('../models');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;
const util = require('../../utils');
const { Op } = require('sequelize');
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const addCourseProg = async (req, res) => {
    try {
        const { CourseId, ProgramId, Year } = req.body;

        if (!util.checkMandatoryFields([CourseId, ProgramId, Year])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing.",
            });
        }

        const course = await Course.findByPk(CourseId);
        if (!course) {
            return res.status(404).json({
                successful: false,
                message: "Course not found.",
            });
        }

        const prog = await Program.findByPk(ProgramId);
        if (!prog) {
            return res.status(404).json({
                successful: false,
                message: "Program not found.",
            });
        }

        if (Year < 1 || Year > 6) {
            return res.status(406).json({
                successful: false,
                message: "Year must be greater than 0 and less than 6.",
            });
        }

        const existingPairing = await CourseProg.findOne({ where: { CourseId, ProgramId, Year } });
        if (existingPairing) {
            return res.status(400).json({
                successful: false,
                message: "This course is already associated with this program and year.",
            });
        }

        await CourseProg.create({ CourseId, ProgramId, Year });

        return res.status(200).json({
            successful: true,
            message: "Successfully associated course with program.",
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred.",
        });
    }
}
const getCoursesByProg = async (req, res, next) => {
    try {
        const progId = req.params.id;
        const courses = await Course.findAll({
            include: {
                model: Program,
                through: {
                    model: CourseProg,
                    where: { ProgramId: progId }
                },
            }
        });
        if (!courses || courses.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No courses found",
                count: 0,
                data: [],
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all courses",
                count: courses.length,
                data: courses,
            });
        }
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred.",
        });
    }
}
const updateCourseProg = async (req, res, next) => {
    try {
        const { CourseId, ProgramId, Year } = req.body;

        if (!util.checkMandatoryFields([CourseId, ProgramId, Year])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing.",
            });
        }

        const course = await Course.findByPk(CourseId);
        if (!course) {
            return res.status(404).json({
                successful: false,
                message: "Course not found.",
            });
        }

        const program = await Program.findByPk(ProgramId);
        if (!program) {
            return res.status(404).json({
                successful: false,
                message: "Program not found.",
            });
        }

        const courseProg = await CourseProg.findByPk(req.params.id);
        if (!courseProg) {
            return res.status(404).json({
                successful: false,
                message: "Course-Program association not found.",
            });
        }

        if (Year < 1 || Year > 6) {
            return res.status(406).json({
                successful: false,
                message: "Year must be greater than 0 and less than 6.",
            });
        }

        const existingPairing = await CourseProg.findOne({ where: { CourseId, ProgramId, Year, id: { [Op.ne]: req.params.id } } });
        if (existingPairing) {
            return res.status(400).json({
                successful: false,
                message: "Course, Year, Program association already exist.",
            });
        }

        await courseProg.update({ CourseId, ProgramId, Year })

        return res.status(200).json({
            successful: true,
            message: "Association updated successfully.",
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred.",
        });
    }
}
const deleteCourseProg = async (req, res) => {
    try {
        const courseProg = await CourseProg.findByPk(req.params.id);
        if (!courseProg) {
            return res.status(404).json({
                successful: false,
                message: "Association between the course and program does not exist",
            });
        }

        await CourseProg.destroy({ where: { id: req.params.id } });

        return res.status(200).json({
            successful: true,
            message: "Successfully deleted association.",
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred.",
        });
    }
}

const getProgramsByCourse = async (req, res) => {
    try {
        const courseId = req.params.id;

        // Check if course exists
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({
                successful: false,
                message: "Course not found.",
            });
        }

        // Find all programs associated with this course
        const coursePrograms = await CourseProg.findAll({
            where: { CourseId: courseId },
            include: [
                {
                    model: Program,
                    attributes: ['id', 'Code', 'Name',]
                }
            ]
        });

        if (!coursePrograms || coursePrograms.length === 0) {
            return res.status(200).send({
                successful: true,
                message: "No programs found for this course",
                count: 0,
                data: [],
            });
        }

        // Transform data to include year from CourseProg and the CourseProg ID
        const formattedPrograms = coursePrograms.map(cp => ({
            id: cp.Program.id,             // Program ID
            courseProgramId: cp.id,        // Include CourseProg ID for deletion
            code: cp.Program.Code,
            name: cp.Program.Name,
            year: cp.Year
        }));

        return res.status(200).send({
            successful: true,
            message: "Retrieved all programs for this course",
            count: formattedPrograms.length,
            data: formattedPrograms,
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred.",
        });
    }
}


module.exports = {
    addCourseProg,
    getCoursesByProg,
    updateCourseProg,
    deleteCourseProg,
    getProgramsByCourse
}