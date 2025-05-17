const { Program, Course, CourseProg, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;
const util = require('../../utils');
const { Op } = require('sequelize');
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const addCourseProg = async (req, res) => {
    // Initialize transaction outside try-catch for broader scope
    let transaction;

    try {
        const { CourseId, ProgramId, Year, Semester } = req.body;

        if (!util.checkMandatoryFields([CourseId, ProgramId, Year, Semester])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing.",
            });
        }

        // Find the course and check if it exists
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

        if (Semester < 1 || Semester > 2) {
            return res.status(406).json({
                successful: false,
                message: "Semester must be either 1 or 2.",
            });
        }

        // Check for existing association for the primary course
        const existingPairing = await CourseProg.findOne({ where: { CourseId, ProgramId, Year, Semester } });
        if (existingPairing) {
            return res.status(400).json({
                successful: false,
                message: "This course is already associated with this program, year, and semester.",
            });
        }

        // Check if this course is part of a pair
        const coursePairId = course.PairId;

        // Start a transaction to ensure all operations succeed or fail together
        transaction = await sequelize.transaction();

        // Create the association for the main course
        await CourseProg.create(
            { CourseId, ProgramId, Year, Semester },
            { transaction }
        );

        // If the course is part of a pair, associate the paired course as well
        if (coursePairId) {
            // Find all other courses in this pair
            const pairedCourses = await Course.findAll({
                where: {
                    PairId: coursePairId,
                    id: { [Op.ne]: CourseId } // Exclude the current course
                },
                transaction
            });

            // Create associations for all paired courses
            for (const pairedCourse of pairedCourses) {
                // Check if the paired course already has this association
                const existingPairedAssociation = await CourseProg.findOne({
                    where: {
                        CourseId: pairedCourse.id,
                        ProgramId,
                        Year,
                        Semester
                    },
                    transaction
                });

                // Only create if it doesn't exist
                if (!existingPairedAssociation) {
                    await CourseProg.create({
                        CourseId: pairedCourse.id,
                        ProgramId,
                        Year,
                        Semester
                    }, { transaction });
                }
            }
        }

        // Commit the transaction if everything was successful
        await transaction.commit();

        // Decode refreshToken from cookies to get the accountId for history log
        const token = req.cookies?.refreshToken;
        let accountId = null;

        if (token) {
            try {
                const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
                accountId = decoded.id || decoded.accountId; // adjust based on your token payload
            } catch (err) {
                console.error("Invalid token when logging history:", err);
                // Continue with the operation even if token is invalid
            }
        }

        // Generate the details string for the history log
        const page = 'Course Program Association';
        const courseCode = course.Code || CourseId;
        const programCode = prog.Code || ProgramId;

        let details;
        if (coursePairId) {
            details = `Associated course ${courseCode} and its paired course(s) with program ${programCode} for Year ${Year}, Semester ${Semester}`;
        } else {
            details = `Associated course ${courseCode} with program ${programCode} for Year ${Year}, Semester ${Semester}`;
        }

        // Add history log
        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: coursePairId
                ? "Successfully associated course and its paired course(s) with program."
                : "Successfully associated course with program."
        });
    } catch (err) {
        // If a transaction exists and is still active, roll it back
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("Transaction rollback failed:", rollbackError);
            }
        }

        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred.",
        });
    }
};

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
        const { CourseId, ProgramId, Year, Semester } = req.body;

        if (!util.checkMandatoryFields([CourseId, ProgramId, Year, Semester])) {
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

        if (Semester < 1 || Semester > 2) {
            return res.status(406).json({
                successful: false,
                message: "Semester must be either 1 or 2.",
            });
        }

        const existingPairing = await CourseProg.findOne({
            where: {
                CourseId,
                ProgramId,
                Year,
                Semester,
                id: { [Op.ne]: req.params.id }
            }
        });

        if (existingPairing) {
            return res.status(400).json({
                successful: false,
                message: "Course, Year, Semester, Program association already exists.",
            });
        }

        await courseProg.update({ CourseId, ProgramId, Year, Semester })

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
    // Initialize transaction outside try-catch for broader scope
    let transaction;

    try {
        const courseProgramId = req.params.id;

        // First, fetch the CourseProg to check if it exists and get details for the log
        const courseProg = await CourseProg.findByPk(courseProgramId, {
            include: [
                { model: Course },
                { model: Program }
            ]
        });

        if (!courseProg) {
            return res.status(404).json({
                successful: false,
                message: "Association between the course and program does not exist",
            });
        }

        // Get details before deletion for history log
        const courseId = courseProg.CourseId;
        const programId = courseProg.ProgramId;
        const year = courseProg.Year;
        const semester = courseProg.Semester;

        // Get course to check if it's part of a pair
        const course = courseProg.Course || await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({
                successful: false,
                message: "Course not found.",
            });
        }

        // Check if this course is part of a pair
        const coursePairId = course.PairId;

        // Start a transaction
        transaction = await sequelize.transaction();

        // Delete the association for the main course
        await CourseProg.destroy({
            where: { id: courseProgramId },
            transaction
        });

        // If the course is part of a pair, remove the association for paired courses as well
        if (coursePairId) {
            // Find all other courses in this pair
            const pairedCourses = await Course.findAll({
                where: {
                    PairId: coursePairId,
                    id: { [Op.ne]: courseId } // Exclude the primary course
                },
                transaction
            });

            // Delete associations for all paired courses
            for (const pairedCourse of pairedCourses) {
                await CourseProg.destroy({
                    where: {
                        CourseId: pairedCourse.id,
                        ProgramId: programId,
                        Year: year,
                        Semester: semester
                    },
                    transaction
                });
            }
        }

        // Commit the transaction
        await transaction.commit();

        // Decode refreshToken from cookies to get the accountId for history log
        const token = req.cookies?.refreshToken;
        let accountId = null;

        if (token) {
            try {
                const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
                accountId = decoded.id || decoded.accountId;
            } catch (err) {
                console.error("Invalid token when logging history:", err);
                // Continue with the operation even if token is invalid
            }
        }

        // Generate the details string for the history log
        const page = 'Course Program Association';
        const courseCode = course.Code || courseId;
        const programCode = courseProg.Program?.Code || programId;

        let details;
        if (coursePairId) {
            details = `Removed association of course ${courseCode} and its paired course(s) with program ${programCode} for Year ${year}, Semester ${semester}`;
        } else {
            details = `Removed association of course ${courseCode} with program ${programCode} for Year ${year}, Semester ${semester}`;
        }

        // Add history log
        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: coursePairId
                ? "Successfully deleted association for course and its paired course(s)."
                : "Successfully deleted association.",
        });
    } catch (err) {
        // If a transaction exists and is still active, roll it back
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("Transaction rollback failed:", rollbackError);
            }
        }

        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred.",
        });
    }
};

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

        // Transform data to include year, semester from CourseProg and the CourseProg ID
        const formattedPrograms = coursePrograms.map(cp => ({
            id: cp.Program.id,             // Program ID
            courseProgramId: cp.id,        // Include CourseProg ID for deletion
            code: cp.Program.Code,
            name: cp.Program.Name,
            year: cp.Year,
            semester: cp.Semester
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