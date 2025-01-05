const { Professor, Course, Settings } = require('../models')
const util = require('../../utils')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const isExceedingUnitLimit = (settings, status, newTotalUnits) => {
    const limits = {
        "Full-time": settings.FullTimeMax,
        "Part-time": settings.PartTimeMax,
        "Fixed-term": settings.FullTimeMax
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

        const addedProfs = [];

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
            addedProfs.push(Name);

        }

        // Log the archive action
        const accountId = '1'; // Example account ID for testing
        const page = 'Professor';
        const details = `Added Professor${addedProfs.length > 1 ? 's' : ''}: ${addedProfs.join(', ')}`;

        await addHistoryLog(accountId, page, details);

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

        // Log the archive action
        const accountId = '1'; // Example account ID for testing
        const page = 'Professor';
        const details = `Deleted Professor record for: ${professor.Name}`; // Include professor's name or other info

        await addHistoryLog(accountId, page, details);

        // Delete the professor record
        const deleteProf = await Professor.destroy({
            where: {
                id: req.params.id, // Replace with the ID of the record you want to delete
            },
        });

        if (deleteProf) {
            res.status(200).send({
                successful: true,
                message: "Successfully deleted professor."
            });
        } else {
            res.status(400).send({
                successful: false,
                message: "Professor not found."
            });
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
        const { name, email, status } = req.body
        console.log("req.body:", name, email, status)
        console.log("req.body:",req.body)

        if (!prof) {
            res.status(404).send({
                successful: false,
                message: "Professor not found"
            });
        }

        if (!util.checkMandatoryFields([name, email, status])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            })
        }

        // Validate email format
        if (!util.validateEmail(email)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid email format."
            });
        }

        if (!['Full-time', 'Part-time', 'Fixed-term'].includes(status)) {
            return res.status(406).json({
                successful: false,
                message: "Invalid status. Allowed values are: Full-time, Part-time, Fixed-term."
            });
        }

        if (email !== prof.Email) {
            const emailConflict = await Professor.findOne({ where: { email: email } })
            if (emailConflict) {
                return res.status(406).json({
                    successful: false,
                    message: "Email already exists. Please use a different email."
                })
            }
        }



        // Log the archive action
        const accountId = '1'; // Example account ID for testing
        const page = 'Professor';
        const details = `Updated Professor: Old; Name: ${prof.Name}, Email: ${prof.Email}, Status: ${prof.Status};;; New; Name: ${name}, Email: ${email}, Status: ${status}`;

        await addHistoryLog(accountId, page, details);

        const updateProf = await prof.update({
            Name: name,
            Email: email,
            Status: status
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

        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: "Settings not found."
            });
        }

        const newTotalUnits = prof.Total_units + course.Units
        if (isExceedingUnitLimit(settings, prof.Status, newTotalUnits)) {
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

const updateCourseProf = async (req, res, next) => {
    try {
        const { oldCourseId, oldProfId, newCourseId, newProfId } = req.body;

        // Validate input
        if (!util.checkMandatoryFields([oldCourseId, oldProfId, newCourseId, newProfId])) {
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

        const oldProf = await Professor.findByPk(oldProfId);
        if (!oldProf) {
            return res.status(404).json({
                successful: false,
                message: "Professor not found."
            });
        }

        const newCourse = await Course.findByPk(newCourseId);
        if (!newCourse) {
            return res.status(404).json({
                successful: false,
                message: "Course not found."
            });
        }

        let newProf = await Professor.findByPk(newProfId);
        if (!newProf) {
            return res.status(404).json({
                successful: false,
                message: "Professor not found."
            });
        }

        const existingAssociation = await oldCourse.hasCourseProfs(oldProfId)
        if (!existingAssociation) {
            return res.status(404).json({
                successful: false,
                message: "Association between the course and professor does not exist."
            });
        }

        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(404).json({
                successful: false,
                message: "Settings not found."
            });
        }

        const decUnits = oldProf.Total_units - oldCourse.Units
        await oldProf.update({
            Total_units: decUnits
        })
        newProf = await Professor.findByPk(newProfId)

        const incUnits = newProf.Total_units + newCourse.Units
        if (isExceedingUnitLimit(settings, newProf.Status, incUnits)) {
            const prevUnits = decUnits + oldCourse.Units
            await oldProf.update({
                Total_units: prevUnits
            })
            return res.status(400).send({
                successful: false,
                message: `Professor ${newProf.Name} has exceeded the total units limit.`
            })
        }
        await newProf.update({
            Total_units: incUnits
        })

        await oldProf.removeProfCourses(oldCourseId)
        await newProf.addProfCourses(newCourseId)

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
    addProf,
    getAllProf,
    getProf,
    deleteProf,
    updateProf,
    addCourseProf,
    deleteCourseProf,
    getProfsByCourse,
    updateCourseProf
}
