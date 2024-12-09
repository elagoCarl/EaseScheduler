const { Professor, Course } = require('../models')
const util = require('../../utils')
const isExceedingUnitLimit = (status, newTotalUnits) => {
    const limits = {
        "Full-time": 24,
        "Part-time": 12,
        "Fixed-term": 12
    }

    return newTotalUnits > (limits[status] || 0);
}

const addProf = async (req, res, next) => {
    try {
        let professorsToAdd = req.body;

        // Check if the request body contains an array of professors
        if (!Array.isArray(professorsToAdd)) {
            // If not an array, convert the single professor to an array
            professorsToAdd = [professorsToAdd];
        }

        for (const professorData of professorsToAdd) {
            const { Name, Email, Status } = professorData;

            if (!util.checkMandatoryFields([Name, Email, Status])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                })
            }

            // Validate email format
            if (!util.validateEmail(Email)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid email format."
                });
            }

            if (!['Full-time', 'Part-time', 'Fixed-term'].includes(Status)) {
                return res.status(406).json({
                    successful: false,
                    message: "Invalid status. Allowed values are: Full-time, Part-time, Fixed-term."
                });
            }

            // Check if the email already exists
            const existingEmail = await Professor.findOne({ where: { Email } });
            if (existingEmail) {
                return res.status(406).json({
                    successful: false,
                    message: "Email already exists. Please use a different email."
                })
            }

            const newProf = await Professor.create({
                Name: Name,
                Email: Email,
                Status: Status,
                Total_units: 0
            })
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new professor."
        })

    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getAllProf = async (req, res, next) => {
    try {
        let professor = await Professor.findAll()
        if (!professor || professor.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No professor found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all professors",
                count: professor.length,
                data: professor
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

const getProf = async (req, res, next) => {
    try {
        let prof = await Professor.findByPk(req.params.id)


        if (!prof) {
            res.status(404).send({
                successful: false,
                message: "Professor not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Successfully retrieved professor.",
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

const deleteProf = async (req, res, next) => {
    try {
        const deleteProf = await Professor.destroy({
            where: {
                id: req.params.id, // Replace with the ID of the record you want to delete
            },
        })
        if (deleteProf) {
            res.status(200).send({
                successful: true,
                message: "Successfully deleted professor."
            })
        } else {
            res.status(400).send({
                successful: false,
                message: "Professor not found."
            })
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
        const { Name, Email, Status } = req.body

        if (!prof) {
            res.status(404).send({
                successful: false,
                message: "Professor not found"
            });
        }

        if (!util.checkMandatoryFields([Name, Email, Status])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            })
        }

        // Validate email format
        if (!util.validateEmail(Email)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid email format."
            });
        }

        if (!['Full-time', 'Part-time', 'Fixed-term'].includes(Status)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid status. Allowed values are: Full-time, Part-time, Fixed-term."
            });
        }

        if (Email !== prof.Email) {
            const emailConflict = await Professor.findOne({ where: { Email: Email } })
            if (emailConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Email already exists. Please use a different email."
                })
            }
        }

        const updateProf = await prof.update({
            Name: Name,
            Email: Email,
            Status: Status
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

const addCourseProf = async (req, res) => {
    try {
        const { courseId, profId } = req.body;

        if (!util.checkMandatoryFields([courseId, profId])) {
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

        const prof = await Professor.findByPk(profId);
        if (!prof) {
            return res.status(404).json({
                successful: false,
                message: "Professor not found."
            });
        }

        const newTotalUnits = prof.Total_units + course.Units
        if (isExceedingUnitLimit(prof.Status, newTotalUnits)) {
            return res.status(400).send({
                successful: false,
                message: `Professor ${prof.Name} has exceeded the total units limit.`
            })
        }

        await prof.update({
            Total_units: newTotalUnits
        })

        // Create the association
        await course.addCourseProfs(profId);

        return res.status(200).json({
            successful: true,
            message: "Successfully associated course with professor."
        });
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const deleteCourseProf = async (req, res) => {
    try {
        const { courseId, profId } = req.body;

        if (!util.checkMandatoryFields([courseId, profId])) {
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

        const prof = await Professor.findByPk(profId);
        if (!prof) {
            return res.status(404).json({
                successful: false,
                message: "Professor not found."
            });
        }

        const existingAssociation = await course.hasCourseProfs(profId)
        if (!existingAssociation) {
            return res.status(404).json({
                successful: false,
                message: "Association between the course and professor does not exist."
            });
        }

        const newTotalUnits = prof.Total_units - course.Units

        await prof.update({
            Total_units: newTotalUnits
        })

        await course.removeCourseProfs(profId);

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

const getProfsByCourse = async (req, res, next) => {
    try {
        const courseId = req.params.id
        const profs = await Professor.findAll({
            attributes: { exclude: ['ProfCourses'] }, // Exclude ProfCourses field
            include: {
                model: Course,
                as: 'ProfCourses',
                where: {
                    id: courseId, 
                },
                attributes: [],
                through: {
                    attributes: []
                }
            }
        })
        if (!profs || profs.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No professor found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all professors",
                count: profs.length,
                data: profs
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



module.exports = {
    addProf,
    getAllProf,
    getProf,
    deleteProf,
    updateProf,
    addCourseProf,
    deleteCourseProf,
    getProfsByCourse
}
