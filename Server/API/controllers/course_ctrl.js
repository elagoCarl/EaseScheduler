const { Course, Professor, Department, Settings } = require('../models');
const util = require('../../utils');
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const addCourse = async (req, res) => {
    try {
        let courses = req.body;

        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(406).json({
                successful: false,
                message: 'Settings not found.'
            })
        }


        // Ensure the request body is an array
        if (!Array.isArray(courses)) {
            courses = [courses];
        }

        const addedCourses = [];

        for (const course of courses) {
            const { Code, Description, Duration, Units, Type, Dept_id } = course;

            // Validate mandatory fields
            //TINANGGAL KO MUNA Dept_id sa check mandatory
            // if (!util.checkMandatoryFields([Code, Description, Duration, Units, Type, Dept_id])) {
            if (!util.checkMandatoryFields([Code, Description, Duration, Units, Type, Dept_id])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            if (Duration > settings.MaxCourseDuration){
                return res.status(406).json({
                    successful: false,
                    message: 'Duration limit reached.'
                });
            }

                // Check if the course already exists
            const existingCourse = await Course.findOne({ where: { Code } });
            if (existingCourse) {
                return res.status(400).json({
                    successful: false,
                    message: `Course with code ${Code} already exists.`
                });
            }

            if (!['Core', 'Professional'].includes(Type)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid status. Allowed values are: Core, Professional."
                });
            }

            // Create the new course
            const newCourse = await Course.create({
                Code,
                Description,
                Duration,
                Units,
                Type
            });

            if (Type === 'Professional') {
                await newCourse.addCourseDepts(Dept_id);
            }

            addedCourses.push(Code);
        }

        // Log the archive action
        const accountId = '1'; // Example account ID for testing
        const page = 'Course';
        const details = `Added Course${addedCourses.length > 1 ? 's' : ''}: ${addedCourses.join(', ')}`;

        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: "Successfully added new course(s)."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.findAll();

        if (!courses || courses.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No courses found",
                count: 0,
                data: []
            });
        }

        return res.status(200).json({
            successful: true,
            message: "Retrieved all courses",
            count: courses.length,
            data: courses
        });
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const deleteCourse = async (req, res, next) => {
    try {
        // Find the course before deletion for detailed logging
        const course = await Course.findOne({
            where: { id: req.params.id }
        });

        if (!course) {
            return res.status(400).send({
                successful: false,
                message: "Course not found."
            });
        }

        // Delete the course
        await Course.destroy({
            where: { id: req.params.id }
        });

        // Log the archive action
        const accountId = '1'; // Example account ID for testing
        const page = 'Course';
        const details = `Deleted Course: Code - ${course.Code}, Description - ${course.Description}`;

        await addHistoryLog(accountId, page, details);

        res.status(200).send({
            successful: true,
            message: "Successfully deleted course."
        });
    } catch (err) {
        res.status(500).send({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const getCourse = async (req, res, next) => {
    try {
        let prof = await Course.findByPk(req.params.id)


        if (!prof) {
            res.status(404).send({
                successful: false,
                message: "Course not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Successfully retrieved Course.",
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

const updateCourse = async (req, res) => {
    try {
        // Find course by primary key
        const course = await Course.findByPk(req.params.id);
        const { Code, Description, Duration, Units, Type } = req.body;

        // Check if course exists
        if (!course) {
            return res.status(404).json({
                successful: false,
                message: "Course not found."
            });
        }

        // Validate mandatory fields
        if (!util.checkMandatoryFields([Code, Description, Duration, Units, Type])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        // Validate that `Duration` and `Units` are positive integers
        if (Duration <= 0 || Units <= 0) {
            return res.status(406).json({
                successful: false,
                message: "Duration and Units must be positive integers."
            });
        }

        // Check for course code conflicts if it's being updated
        if (Code !== course.Code) {
            const codeConflict = await Course.findOne({ where: { Code } });
            if (codeConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Course code already exists. Please use a different code."
                });
            }
        }
        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(406).json({
                successful: false,
                message: 'Settings not found.'
            })
        }

        if (Duration > settings.MaxCourseDuration){
            return res.status(406).json({
                successful: false,
                message: 'Duration limit reached.'
            });
        }

        // Store old course details for history logging
        const oldDetails = {
            Code: course.Code,
            Description: course.Description,
            Duration: course.Duration,
            Units: course.Units,
            Type: course.Type
        };

        // Update course details
        await course.update({
            Code,
            Description,
            Duration,
            Units,
            Type
        });

        // Log the archive action
        const accountId = '1'; // Example account ID for testing
        const page = 'Course';
        const details = `Updated Course: Old Code: ${oldDetails.Code}, Desc: ${oldDetails.Description}, Duration: ${oldDetails.Duration}, Units: ${oldDetails.Units}, Type: ${oldDetails.Type}; New Code: ${Code}, Desc: ${Description}, Duration: ${Duration}, Units: ${Units}, Type: ${Type}`;

        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: "Successfully updated course."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
};


const getCourseByProf = async (req, res, next) => {
    try {
        const profId = req.params.id
        const courses = await Course.findAll({
            attributes: { exclude: ['CourseProfs'] },
            include: {
                model: Professor,
                as: 'CourseProfs',
                where: {
                    id: profId,
                },
                attributes: [],
                through: {
                    attributes: []
                }
            }
        })
        if (!courses || courses.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No courses found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all courses",
                count: courses.length,
                data: courses
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

const addDeptCourse = async (req, res) => {
    try {
        const { courseId, deptId } = req.body;

        if (!util.checkMandatoryFields([courseId, deptId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({
                successful: false,
                message: "Course not found."
            });
        }

        const dept = await Department.findByPk(deptId);
        if (!dept) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        await course.addCourseDepts(deptId);

        return res.status(200).json({
            successful: true,
            message: "Successfully associated course with department."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const deleteDeptCourse = async (req, res) => {
    try {
        const { courseId, deptId } = req.body;

        if (!util.checkMandatoryFields([courseId, deptId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({
                successful: false,
                message: "Course not found."
            });
        }

        const dept = await Department.findByPk(deptId);
        if (!dept) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const existingAssociation = await course.hasCourseDepts(deptId)
        if (!existingAssociation) {
            return res.status(404).json({
                successful: false,
                message: "Association between the course and department does not exist."
            });
        }

        await course.removeCourseDepts(deptId);

        return res.status(200).json({
            successful: true,
            message: "Successfully deleted association."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const getCoursesByDept = async (req, res, next) => {
    try {
        const deptId = req.params.id
        const courses = await Course.findAll({
            attributes: { exclude: ['CourseDepts'] },
            include: {
                model: Department,
                as: 'CourseDepts',
                where: {
                    id: deptId,
                },
                attributes: [],
                through: {
                    attributes: []
                }
            }
        })
        if (!courses || courses.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No courses found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all courses",
                count: courses.length,
                data: courses
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

const updateDeptCourse = async (req, res, next) => {
    try {
        const { oldCourseId, oldDeptId, newCourseId, newDeptId } = req.body;

        if (!util.checkMandatoryFields([oldCourseId, oldDeptId, newCourseId, newDeptId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const oldCourse = await Course.findByPk(oldCourseId);
        if (!oldCourse) {
            return res.status(404).json({
                successful: false,
                message: "Course not found."
            });
        }

        const oldDept = await Department.findByPk(oldDeptId);
        if (!oldDept) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const newCourse = await Course.findByPk(newCourseId);
        if (!newCourse) {
            return res.status(404).json({
                successful: false,
                message: "Course not found."
            });
        }

        const newDept = await Department.findByPk(newDeptId);
        if (!newDept) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const existingAssociation = await oldCourse.hasCourseDepts(oldDeptId)
        if (!existingAssociation) {
            return res.status(404).json({
                successful: false,
                message: "Association between the course and department does not exist."
            });
        }


        await oldDept.removeDeptCourses(oldCourseId)
        await newDept.addDeptCourses(newCourseId)

        return res.status(200).json({
            successful: true,
            message: "Association updated successfully."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

module.exports = {
    addCourse,
    getAllCourses,
    deleteCourse,
    getCourse,
    updateCourse,
    getCourseByProf,
    addDeptCourse,
    deleteDeptCourse,
    getCoursesByDept,
    updateDeptCourse
}
