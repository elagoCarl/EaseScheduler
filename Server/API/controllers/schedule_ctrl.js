const { Schedule, Room, Assignation, Professor, Course, Department } = require('../models');
const { Op } = require('sequelize');
const util = require("../../utils");

// Constraint variables
const professorMaxLimit = 12; // Max hours a professor can stay at school per day
const professorInterval = { shortBreak: 0.5, longBreak: 1, maxHours: 6 }; // Break intervals for professors
const studentInterval = { shortBreak: 0.5, longBreak: 1, maxHours: 6 }; // Break intervals for students

// Add Schedule
const addSchedule = async (req, res, next) => {
    try {
        let schedule = req.body;

        if (!Array.isArray(schedule)) {
            schedule = [schedule];
        }

        const createdSchedules = [];

        for (const sched of schedule) {
            const { Day, Start_time, End_time, RoomId, AssignationId } = sched;

            // Validate mandatory fields
            if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId])) {
                return res.status(400).json({ successful: false, message: "A mandatory field is missing." });
            }

            // Validate Room existence
            const room = await Room.findByPk(RoomId);
            if (!room) {
                return res.status(404).json({ 
                    successful: false, 
                    message: `Room with ID ${RoomId} not found. Please provide a valid RoomId.` 
                });
            }

            // Validate Assignation existence
            const assignation = await Assignation.findByPk(AssignationId);
            if (!assignation) {
                return res.status(404).json({ 
                    successful: false, 
                    message: `Assignation with ID ${AssignationId} not found. Ensure the AssignationId is correct.` 
                });
            }

            // Check for conflicting schedules in the same room on the same day
            const existingSchedules = await Schedule.findAll({
                where: { Day, RoomId }
            });

            const isConflict = existingSchedules.some(existing => {
                return (
                    (Start_time >= existing.Start_time && Start_time < existing.End_time) ||  // Overlaps start time
                    (End_time > existing.Start_time && End_time <= existing.End_time) ||     // Overlaps end time
                    (Start_time <= existing.Start_time && End_time >= existing.End_time)      // Fully covers existing schedule
                );
            });

            if (isConflict) {
                return res.status(400).json({
                    successful: false,
                    message: `Schedule conflict detected: Room ${RoomId} is already booked on ${Day} within ${Start_time} - ${End_time}.`,
                });
            }

            // Create schedule
            const newSchedule = await Schedule.create({ Day, Start_time, End_time, RoomId, AssignationId });
            createdSchedules.push(newSchedule);
        }

        return res.status(201).json({ 
            successful: true, 
            message: "Successfully created schedules.",
            schedules: createdSchedules
        });

    } catch (error) {
        // Handle Sequelize validation errors
        if (error.name === "SequelizeValidationError") {
            return res.status(400).json({ 
                successful: false, 
                message: "Validation error occurred. Some fields have incorrect values.",
                errors: error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                }))
            });
        }

        // Handle unique constraint violation (if applicable)
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({
                successful: false,
                message: "A schedule with the same details already exists.",
                errors: error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                }))
            });
        }

        // General database errors
        if (error.name === "SequelizeDatabaseError") {
            return res.status(500).json({
                successful: false,
                message: "Database error occurred.",
                details: error.message
            });
        }

        next(error);
    }
};




// Automate Schedule
const backtrackSchedule = async (assignations, rooms, professorSchedule, courseSchedules, index, report) => {
    // Base case: If all assignations are scheduled, return true
    if (index === assignations.length) return true;

    const assignation = assignations[index];
    const { Course, Professor } = assignation;
    const duration = Course.Duration || 1;

    for (const room of rooms) {
        for (let day = 1; day <= 5; day++) { // Iterate through weekdays
            for (let startHour = 8; startHour + duration <= 20; startHour++) { // Iterate through time slots
                // Check constraints for professor, course, and room
                if (
                    canScheduleProfessor(professorSchedule[Professor.id], startHour, duration) &&
                    canScheduleStudent(courseSchedules, Course.id, day, startHour, duration) &&
                    await isRoomAvailable(room.id, day, startHour, duration)
                ) {
                    // Assign schedule
                    const createdSchedule = await Schedule.create({
                        Day: day,
                        Start_time: `${startHour}:00`,
                        End_time: `${startHour + duration}:00`,
                        RoomId: room.id,
                        AssignationId: assignation.id
                    });

                    // Update temporary data
                    professorSchedule[Professor.id].hours += duration;
                    professorSchedule[Professor.id].dailyTimes.push({ day, start: startHour, end: startHour + duration });
                    if (!courseSchedules[Course.id]) courseSchedules[Course.id] = [];
                    courseSchedules[Course.id].push({ day, start: startHour, end: startHour + duration });
                    report.push({
                        Professor: Professor.Name,
                        Course: Course.Code,
                        Room: room.Code,
                        Day: createdSchedule.Day,
                        Start_time: createdSchedule.Start_time,
                        End_time: createdSchedule.End_time
                    });

                    // Recursive step: Try to schedule the next assignation
                    if (await backtrackSchedule(assignations, rooms, professorSchedule, courseSchedules, index + 1, report)) {
                        return true; // Found a valid schedule
                    }

                    // Backtrack: Undo changes
                    await createdSchedule.destroy();
                    professorSchedule[Professor.id].hours -= duration;
                    professorSchedule[Professor.id].dailyTimes.pop();
                    courseSchedules[Course.id].pop();
                    report.pop();
                }
            }
        }
    }

    return false; // No valid schedule for this assignation
};

const automateSchedule = async (req, res, next) => {
    try {
        const { DepartmentId } = req.body;

        if (!DepartmentId) {
            return res.status(400).json({ successful: false, message: "Department ID is required." });
        }

        // Validate Department
        const department = await Department.findByPk(DepartmentId, {
            include: [{ model: Assignation, include: [Course, Professor] }]
        });

        if (!department) {
            return res.status(404).json({ successful: false, message: "Department not found." });
        }

        // Remove existing schedules for this department
        await Schedule.destroy({
            where: { AssignationId: { [Op.in]: department.Assignations.map(a => a.id) } }
        });

        const assignations = department.Assignations;
        const rooms = await Room.findAll();
        const professorSchedule = {};
        const courseSchedules = {};
        const report = [];

        // Initialize professor schedules
        assignations.forEach(assignation => {
            const { Professor } = assignation;
            if (!professorSchedule[Professor.id]) {
                professorSchedule[Professor.id] = { hours: 0, dailyTimes: [] };
            }
        });

        // Start backtracking
        const success = await backtrackSchedule(assignations, rooms, professorSchedule, courseSchedules, 0, report);

        if (!success) {
            return res.status(400).json({
                successful: false,
                message: "Unable to generate a valid schedule with the given constraints."
            });
        }

        return res.status(200).json({
            successful: true,
            message: "Schedule automated successfully.",
            scheduleReport: report
        });
    } catch (error) {
        next(error);
    }
};

// Helper function to check room availability
const isRoomAvailable = async (roomId, day, startHour, duration) => {
    const conflictingSchedules = await Schedule.findOne({
        where: {
            RoomId: roomId,
            Day: day,
            [Op.or]: [
                { Start_time: { [Op.lt]: `${startHour + duration}:00`, [Op.gte]: `${startHour}:00` } },
                { End_time: { [Op.gt]: `${startHour}:00`, [Op.lte]: `${startHour + duration}:00` } }
            ]
        }
    });
    return !conflictingSchedules;
};

// Helper function to check professor constraints
const canScheduleProfessor = (professorSchedule, startHour, duration) => {
    if (professorSchedule.hours + duration > 12) return false; // Exceeds max hours
    for (const time of professorSchedule.dailyTimes) {
        if (
            (startHour >= time.start && startHour < time.end) || // Overlaps with existing schedule
            (startHour + duration > time.start && startHour + duration <= time.end)
        ) {
            return false;
        }
    }
    return true;
};

// Helper function to check course constraints
const canScheduleStudent = (courseSchedules, courseId, day, startHour, duration) => {
    if (!courseSchedules[courseId]) return true; // No existing schedules for the course
    for (const schedule of courseSchedules[courseId]) {
        if (
            schedule.day === day &&
            (
                (startHour >= schedule.start && startHour < schedule.end) || // Overlaps with existing schedule
                (startHour + duration > schedule.start && startHour + duration <= schedule.end)
            )
        ) {
            return false;
        }
    }
    return true;
};

// module.exports = {
//     addSchedule,
//     automateSchedule,
//     getSchedule: async (req, res, next) => {
//         try {
//             const { id } = req.params;
//             const schedule = await Schedule.findByPk(id, { include: [Room, Assignation] });
//             if (!schedule) return res.status(404).json({ successful: false, message: "Schedule not found." });
//             res.status(200).json({ successful: true, data: schedule });
//         } catch (error) {
//             next(error);
//         }
//     },
//     getAllSchedules: async (req, res, next) => {
//         try {
//             const schedules = await Schedule.findAll({ include: [Room, Assignation] });
//             res.status(200).json({ successful: true, data: schedules });
//         } catch (error) {
//             next(error);
//         }
//     },
//     updateSchedule: async (req, res, next) => {
//         try {
//             const { id } = req.params;
//             const { Day, Start_time, End_time, RoomId, AssignationId } = req.body;
//             if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId])) {
//                 return res.status(400).json({ successful: false, message: "A mandatory field is missing." });
//             }
//             const schedule = await Schedule.findByPk(id);
//             if (!schedule) return res.status(404).json({ successful: false, message: "Schedule not found." });
//             await schedule.update({ Day, Start_time, End_time, RoomId, AssignationId });
//             res.status(200).json({ successful: true, message: "Schedule updated successfully." });
//         } catch (error) {
//             next(error);
//         }
//     },
//     deleteSchedule: async (req, res, next) => {
//         try {
//             const { id } = req.params;
//             const schedule = await Schedule.findByPk(id);
//             if (!schedule) return res.status(404).json({ successful: false, message: "Schedule not found." });
//             await schedule.destroy();
//             res.status(200).json({ successful: true, message: "Schedule deleted successfully." });
//         } catch (error) {
//             next(error);
//         }
//     }
// };


// // Automate Schedule (PATCH)
// const automateSchedule = async (req, res, next) => {
//     try {
//         const defaultDepartment = "CSIT";

//         const department = await Department.findOne({ where: { Name: defaultDepartment } });

//         const assignations = await Assignation.findAll({
//             where: { DepartmentId: department.id },
//         });

//         if(!assignations) {
//             return res.status(404).json({ 
//                 successful: false, 
//                 message: "No assignations found." 
//             });
//         }

//         const rooms = await Room.findAll({
//             include: {
//                 model: Department,
//                 as: 'RoomDepts',
//                 where: { id: department.id }
//             }
//         });
        
//         if(!rooms) {
//             return res.status(404).json({ 
//                 successful: false, 
//                 message: "No rooms found."
//             });
//         }

//         // Automate Schedule
//         for (const assignation of assignations) {
            
//         }

        

//         /*
//          Automation Steps:
//          1. Determine the department (CSIT by default).
//          2. Get all assignations of the department (Course and Professor).
//          3. Get all rooms of the department.
//          4. For each assignation:
//             4. Create a schedule with:
//                 - Assignation (Course and Professor)
//                 - Room
//                 - Day, Start Time, End Time
//                 - Block, School Year, Semester
//                 - Respect the professor's availability.
//          */
//         // TODO: Complete the automation process here
        
//         // To accomplish the automation part:
//         // Create a schedule for each assignation in the department using the available rooms with the professor's availability in mind.
        
//     }catch (error) {
//         next(error);
//     }
// };


// Get a specific Schedule by ID
const getSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findByPk(id, {
            include: [Room, Assignation],
        });

        if (!schedule) {
            return res.status(404).json({ successful: false, message: "Schedule not found." });
        }

        return res.status(200).json({ successful: true, data: schedule });
    } catch (error) {
        next(error);
    }
};

// Get all Schedules
const getAllSchedules = async (req, res, next) => {
    try {
        const schedules = await Schedule.findAll({
            include: [Room, Assignation],
        });

        return res.status(200).json({ successful: true, data: schedules });
    } catch (error) {
        next(error);
    }
};

// Update a Schedule by ID
// Update a Schedule by ID
const updateSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Day, Start_time, End_time, RoomId, AssignationId } = req.body;

        // Validate mandatory fields
        if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId])) {
            return res.status(400).json({ successful: false, message: "A mandatory field is missing." });
        }

        // Validate if the schedule exists
        const schedule = await Schedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({ successful: false, message: "Schedule not found." });
        }

        // Validate Room existence
        const room = await Room.findByPk(RoomId);
        if (!room) {
            return res.status(404).json({ 
                successful: false, 
                message: `Room with ID ${RoomId} not found. Please provide a valid RoomId.` 
            });
        }

        // Validate Assignation existence
        const assignation = await Assignation.findByPk(AssignationId);
        if (!assignation) {
            return res.status(404).json({ 
                successful: false, 
                message: `Assignation with ID ${AssignationId} not found. Ensure the AssignationId is correct.` 
            });
        }

        // Check for conflicting schedules in the same room on the same day (excluding current schedule)
        const existingSchedules = await Schedule.findAll({
            where: {
                Day,
                RoomId,
                id: { [Op.ne]: id } // Exclude current schedule
            }
        });

        const isConflict = existingSchedules.some(existing => {
            return (
                (Start_time >= existing.Start_time && Start_time < existing.End_time) ||  // Overlaps start time
                (End_time > existing.Start_time && End_time <= existing.End_time) ||     // Overlaps end time
                (Start_time <= existing.Start_time && End_time >= existing.End_time)      // Fully covers existing schedule
            );
        });

        if (isConflict) {
            return res.status(400).json({
                successful: false,
                message: `Schedule conflict detected: Room ${RoomId} is already booked on ${Day} within ${Start_time} - ${End_time}.`,
            });
        }

        // Update schedule
        await schedule.update({ Day, Start_time, End_time, RoomId, AssignationId });

        return res.status(200).json({ successful: true, message: "Schedule updated successfully." });
    } catch (error) {
        // Handle Sequelize validation errors
        if (error.name === "SequelizeValidationError") {
            return res.status(400).json({ 
                successful: false, 
                message: "Validation error occurred. Some fields have incorrect values.",
                errors: error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                }))
            });
        }

        // Handle unique constraint violation (if applicable)
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({
                successful: false,
                message: "A schedule with the same details already exists.",
                errors: error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                }))
            });
        }

        // General database errors
        if (error.name === "SequelizeDatabaseError") {
            return res.status(500).json({
                successful: false,
                message: "Database error occurred.",
                details: error.message
            });
        }

        // If it's another unknown error, pass it to the error handler
        next(error);
    }
};


// Delete a Schedule by ID
const deleteSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({ successful: false, message: "Schedule not found." });
        }

        await schedule.destroy();

        return res.status(200).json({ successful: true, message: "Schedule deleted successfully." });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addSchedule,
    automateSchedule,
    getSchedule,
    getAllSchedules,
    updateSchedule,
    deleteSchedule
};
