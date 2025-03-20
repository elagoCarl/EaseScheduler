
// Change the Course into Course model because it is not being imported properly
const { Settings, Schedule, Room, Assignation, Program, Professor, Course, ProgYrSec, Department, Course: CourseModel } = require('../models');
const { Op } = require('sequelize');
const util = require("../../utils");
const { json } = require('body-parser');

// Constraint variables
const professorMaxLimit = 12; // Max hours a professor can stay at school per day
const professorInterval = { shortBreak: 0.5, longBreak: 1, maxHours: 6 }; // Break intervals for professors
const studentInterval = { shortBreak: 0.5, longBreak: 1, maxHours: 6 }; // Break intervals for students per section

// Helper function to convert a time string (e.g., "19:00" or "7:00") into seconds since midnight
const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':');
    // Ensure hours are padded for consistency (optional but useful)
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 3600 + minutes * 60;
};

const isValidTime = (startTime, endTime, res) => {
    // Accept times with one or two digits for hours as per your regex.
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    // Validate format
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return res.status(400).json({
            successful: false,
            message: "Invalid time format. Please use HH:mm in 24-hour format."
        });
    }

    // Ensure start time is earlier than end time by comparing numeric values.
    const startSeconds = timeToSeconds(startTime);
    const endSeconds = timeToSeconds(endTime);

    if (startSeconds >= endSeconds) {
        return res.status(400).json({
            successful: false,
            message: "Start time must be earlier than end time."
        });
    }

    return true;
};

// Add Schedule
const addSchedule = async (req, res, next) => {
    try {
        let schedule = req.body;

        if (!Array.isArray(schedule)) {
            schedule = [schedule];
        }

        const createdSchedules = [];

        for (const sched of schedule) {
            const { Day, Start_time, End_time, RoomId, AssignationId, Sections } = sched;
            console.log(Sections);

            if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId, Sections])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            if (!Array.isArray(Sections) || Sections.length === 0) {
                return res.status(400).json({
                    successful: false,
                    message: "Sections must be a non-empty array of section IDs."
                });
            }

            if (isValidTime(Start_time, End_time, res) !== true) return;

            // Calculate duration of current schedule in hours
            const newStart = timeToSeconds(Start_time);
            const newEnd = timeToSeconds(End_time);
            const currentScheduleDuration = (newEnd - newStart) / 3600; // Convert seconds to hours

            const room = await Room.findByPk(RoomId);
            if (!room) {
                return res.status(404).json({
                    successful: false,
                    message: `Room with ID ${RoomId} not found. Please provide a valid RoomId.`
                });
            }

            const assignation = await Assignation.findByPk(AssignationId, {
                include: [{ model: Course }]
            });
            if (!assignation) {
                return res.status(404).json({
                    successful: false,
                    message: `Assignation with ID ${AssignationId} not found. Ensure the AssignationId is correct.`
                });
            }

            const courseTotalDuration = assignation.Course.Duration;

            const sections = await ProgYrSec.findAll({
                where: {
                    id: { [Op.in]: Sections }
                }
            });
            if (sections.length !== Sections.length) {
                return res.status(404).json({
                    successful: false,
                    message: "One or more sections not found. Please provide valid section IDs."
                });
            }

            // Check for conflicting schedules in the same room on the same day
            const existingRoomSchedules = await Schedule.findAll({
                where: { Day, RoomId }
            });

            // Updated conflict logic that allows back-to-back scheduling.
            const isRoomConflict = existingRoomSchedules.some(existing => {
                const existingStart = timeToSeconds(existing.Start_time);
                const existingEnd = timeToSeconds(existing.End_time);
                return (newStart < existingEnd && newEnd > existingStart);
            });

            if (isRoomConflict) {
                return res.status(400).json({
                    successful: false,
                    message: `Schedule conflict detected: Room ${RoomId} is already booked on ${Day} within ${Start_time} - ${End_time}.`
                });
            }

            // Check duration balance for each section with this course
            for (const sectionId of Sections) {
                // Get all existing schedules for this section with the same course (via assignation)
                const existingSchedules = await Schedule.findAll({
                    include: [
                        {
                            model: ProgYrSec,
                            where: { id: sectionId }
                        },
                        {
                            model: Assignation,
                            where: { CourseId: assignation.Course.id }
                        }
                    ]
                });

                // Calculate total scheduled hours for this section with this course
                let scheduledHours = 0;
                existingSchedules.forEach(schedule => {
                    const start = timeToSeconds(schedule.Start_time);
                    const end = timeToSeconds(schedule.End_time);
                    scheduledHours += (end - start) / 3600; // Convert seconds to hours
                });

                // Check if adding current schedule would exceed course duration
                if (scheduledHours + currentScheduleDuration > courseTotalDuration) {
                    const remainingHours = courseTotalDuration - scheduledHours;
                    return res.status(400).json({
                        successful: false,
                        message: `A section already has ${scheduledHours} hours scheduled for this course. ` +
                            `Adding ${currentScheduleDuration} more hours would exceed the course duration of ${courseTotalDuration} hours. ` +
                            `Remaining balance: ${remainingHours} hours.`
                    });
                }
            }

            // Check for time conflicts for each section
            // Get all schedules associated with the sections
            const sectionSchedules = await Schedule.findAll({
                include: [{
                    model: ProgYrSec,
                    where: {
                        id: { [Op.in]: Sections }
                    }
                }],
                where: { Day }
            });

            // Check for conflicts
            for (const section of Sections) {
                const conflictingSchedules = sectionSchedules.filter(schedule => {
                    // Check if this schedule is associated with the current section
                    const hasSection = schedule.ProgYrSecs.some(s => s.id === section);
                    if (!hasSection) return false;

                    // Check for time overlap
                    const existingStart = timeToSeconds(schedule.Start_time);
                    const existingEnd = timeToSeconds(schedule.End_time);
                    return (newStart < existingEnd && newEnd > existingStart);
                });

                if (conflictingSchedules.length > 0) {
                    return res.status(400).json({
                        successful: false,
                        message: `Schedule conflict detected: Section with ID ${section} already has a schedule on ${Day} within ${Start_time} - ${End_time}.`
                    });
                }
            }

            // All validations passed, create schedule
            const newSchedule = await Schedule.create({
                Day,
                Start_time,
                End_time,
                RoomId,
                AssignationId
            });

            // Associate sections with the schedule
            await newSchedule.addProgYrSecs(Sections);

            // Fetch the newly created schedule with its associated sections
            const createdScheduleWithSections = await Schedule.findByPk(newSchedule.id, {
                include: [ProgYrSec]
            });

            createdSchedules.push(createdScheduleWithSections);
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully created schedules.",
            schedules: createdSchedules
        });

    } catch (error) {
        console.error("Error creating schedule:", error);
        return res.status(500).json({
            successful: false,
            message: error.message || "An error occurred while creating schedules."
        });
    }
};

// Update Schedule
// Update Schedule
const updateSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Day, Start_time, End_time, RoomId, AssignationId, Sections } = req.body;

        // Validate mandatory fields
        if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId, Sections])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        // Validate Sections is a non-empty array
        if (!Array.isArray(Sections) || Sections.length === 0) {
            return res.status(400).json({
                successful: false,
                message: "Sections must be a non-empty array of section IDs."
            });
        }

        // Validate time format and sequence
        if (isValidTime(Start_time, End_time, res) !== true) return;

        // Calculate duration of updated schedule in hours
        const newStart = timeToSeconds(Start_time);
        const newEnd = timeToSeconds(End_time);
        const updatedScheduleDuration = (newEnd - newStart) / 3600; // Convert seconds to hours

        // Validate if the schedule exists
        const schedule = await Schedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({
                successful: false,
                message: "Schedule not found."
            });
        }

        // Validate Room existence
        const room = await Room.findByPk(RoomId);
        if (!room) {
            return res.status(404).json({
                successful: false,
                message: `Room with ID ${RoomId} not found. Please provide a valid RoomId.`
            });
        }

        // Validate Assignation existence with course info
        const assignation = await Assignation.findByPk(AssignationId, {
            include: [{ model: Course }]
        });
        if (!assignation) {
            return res.status(404).json({
                successful: false,
                message: `Assignation with ID ${AssignationId} not found. Ensure the AssignationId is correct.`
            });
        }

        // Get course total duration
        const courseTotalDuration = assignation.Course.Duration;

        // Validate all sections exist
        const sections = await ProgYrSec.findAll({
            where: {
                id: { [Op.in]: Sections }
            }
        });
        if (sections.length !== Sections.length) {
            return res.status(404).json({
                successful: false,
                message: "One or more sections not found. Please provide valid section IDs."
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

        // Updated conflict logic that allows back-to-back scheduling
        const isConflict = existingSchedules.some(existing => {
            const existingStart = timeToSeconds(existing.Start_time);
            const existingEnd = timeToSeconds(existing.End_time);
            return (newStart < existingEnd && newEnd > existingStart);
        });

        if (isConflict) {
            return res.status(400).json({
                successful: false,
                message: `Schedule conflict detected: Room ${RoomId} is already booked on ${Day} within ${Start_time} - ${End_time}.`
            });
        }

        // Check duration balance for each section with this course
        for (const sectionId of Sections) {
            // Get all existing schedules for this section with the same course (via assignation)
            const existingSchedules = await Schedule.findAll({
                include: [
                    {
                        model: ProgYrSec,
                        where: { id: sectionId }
                    },
                    {
                        model: Assignation,
                        where: { CourseId: assignation.Course.id }
                    }
                ],
                where: {
                    id: { [Op.ne]: id } // Exclude current schedule
                }
            });

            // Calculate total scheduled hours for this section with this course
            let scheduledHours = 0;
            existingSchedules.forEach(schedule => {
                const start = timeToSeconds(schedule.Start_time);
                const end = timeToSeconds(schedule.End_time);
                scheduledHours += (end - start) / 3600; // Convert seconds to hours
            });

            // Check if updating current schedule would exceed course duration
            if (scheduledHours + updatedScheduleDuration > courseTotalDuration) {
                const remainingHours = courseTotalDuration - scheduledHours;
                return res.status(400).json({
                    successful: false,
                    message: `A section already has ${scheduledHours} hours scheduled for this course. ` +
                        `Adding ${updatedScheduleDuration} more hours would exceed the course duration of ${courseTotalDuration} hours. ` +
                        `Remaining balance: ${remainingHours} hours.`
                });
            }
        }

        // Check for time conflicts for each section
        // Get all schedules associated with the sections (excluding current schedule)
        const sectionSchedules = await Schedule.findAll({
            include: [{
                model: ProgYrSec,
                where: {
                    id: { [Op.in]: Sections }
                }
            }],
            where: {
                Day,
                id: { [Op.ne]: id } // Exclude current schedule
            }
        });

        // Check for conflicts
        for (const section of Sections) {
            const conflictingSchedules = sectionSchedules.filter(schedule => {
                // Check if this schedule is associated with the current section
                const hasSection = schedule.ProgYrSecs.some(s => s.id === section);
                if (!hasSection) return false;

                // Check for time overlap
                const existingStart = timeToSeconds(schedule.Start_time);
                const existingEnd = timeToSeconds(schedule.End_time);
                return (newStart < existingEnd && newEnd > existingStart);
            });

            if (conflictingSchedules.length > 0) {
                return res.status(400).json({
                    successful: false,
                    message: `Schedule conflict detected: Section with ID ${section} already has a schedule on ${Day} within ${Start_time} - ${End_time}.`
                });
            }
        }

        // Update schedule
        await schedule.update({ Day, Start_time, End_time, RoomId, AssignationId });

        // Update section associations
        await schedule.setProgYrSecs(Sections);

        // Fetch the updated schedule with its associated sections
        const updatedScheduleWithSections = await Schedule.findByPk(id, {
            include: [ProgYrSec]
        });

        return res.status(200).json({
            successful: true,
            message: "Schedule updated successfully.",
            schedule: updatedScheduleWithSections
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An error occurred while updating the schedule."
        });
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
        return res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

const backtrackSchedule = async (assignations, rooms, professorSchedule, courseSchedules, index, report, startHour, endHour) => {
    console.log("Entered backtracking");

    // Base case: if all assignations are scheduled, return true.
    if (index === assignations.length) return true;

    const assignation = assignations[index];
    const { Course, Professor } = assignation;
    const duration = Course.Duration;

    console.log("Processing Course:", Course.Code, "Type:", Course.Type);

    let validProgYrSecs = [];

    if (Course.Type === "Core") {
        console.log("Processing Core Course");

        validProgYrSecs = await ProgYrSec.findAll({
            where: { Year: Course.Year }
        });

        if (!validProgYrSecs.length) {
            console.log(`No sections found for Core Course ${Course.Code} with Year=${Course.Year}`);
            return false;
        }
    } else if (Course.Type === "Professional") {
        console.log("Processing Professional Course");

        const courseWithPrograms = await CourseModel.findOne({
            where: { id: Course.id },
            include: {
                model: Program,
                as: 'CourseProgs',
                attributes: ['id']
            }
        });

        if (!courseWithPrograms || !courseWithPrograms.CourseProgs.length) {
            console.log(`No allowed programs for Professional Course ${Course.Code}`);
            return false;
        }

        const allowedProgramIds = courseWithPrograms.CourseProgs.map(program => program.id);

        validProgYrSecs = await ProgYrSec.findAll({
            where: {
                Year: Course.Year,
                ProgramId: { [Op.in]: allowedProgramIds }
            }
        });

        if (!validProgYrSecs.length) {
            console.log(`No matching sections for Professional Course ${Course.Code}`);
            return false;
        }
    } else {
        console.log(`Unknown Course Type: ${Course.Type}`);
        return false;
    }

    console.log("Grouping valid sections by Program and Year...");
    const groups = {};
    validProgYrSecs.forEach(section => {
        const key = `${section.ProgramId}-${section.Year}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(section);
    });

    const scheduleGroup = async (sectionGroup, room, day, hour) => {
        const createdSchedule = await Schedule.create({
            Day: day,
            Start_time: `${hour}:00`,
            End_time: `${hour + duration}:00`,
            RoomId: room.id,
            AssignationId: assignation.id
        });
        await createdSchedule.addProgYrSecs(sectionGroup);

        professorSchedule[Professor.id][day].hours += duration;
        professorSchedule[Professor.id][day].dailyTimes.push({ start: hour, end: hour + duration });
        courseSchedules[Course.id][day].push({ start: hour, end: hour + duration });

        report.push({
            Professor: Professor.Name,
            Course: Course.Code,
            CourseType: Course.Type,
            Sections: sectionGroup.map(sec => `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`),
            Room: room.Code,
            Day: day,
            Start_time: `${hour}:00`,
            End_time: `${hour + duration}:00`
        });

        if (await backtrackSchedule(assignations, rooms, professorSchedule, courseSchedules, index + 1, report, startHour, endHour)) {
            return true;
        }

        await createdSchedule.destroy();
        professorSchedule[Professor.id][day].hours -= duration;
        professorSchedule[Professor.id][day].dailyTimes.pop();
        courseSchedules[Course.id][day].pop();
        report.pop();

        return false;
    };

    for (const groupKey in groups) {
        const group = groups[groupKey];
        const totalStudents = group.reduce((sum, section) => sum + section.No_Of_Students, 0);
        const schedulingStrategy = totalStudents <= 50 ? "combined" : "separate";
        console.log(`Using ${schedulingStrategy} scheduling for ${group.length} sections`);

        for (let day = 1; day <= 5; day++) {
            for (const room of rooms) {
                for (let hour = startHour; hour + duration <= endHour; hour++) {
                    if (
                        canScheduleProfessor(professorSchedule[Professor.id][day], hour, duration) &&
                        canScheduleStudent(courseSchedules[Course.id][day], hour, duration) &&
                        (await isRoomAvailable(room.id, day, hour, duration))
                    ) {
                        if (await scheduleGroup(group, room, day, hour)) {
                            return true;
                        }
                    }
                }
            }
        }
    }

    return false;
};

const automateSchedule = async (req, res, next) => {
    try {
        const { DepartmentId } = req.body;

        if (!DepartmentId) {
            return res.status(400).json({ successful: false, message: "Department ID is required." });
        }

        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(404).json({ successful: false, message: "Scheduling settings not found." });
        }

        const { StartHour, EndHour } = settings;

        const department = await Department.findByPk(DepartmentId, {
            include: [{ model: Assignation, include: [Course, Professor] }]
        });

        if (!department) {
            return res.status(404).json({ successful: false, message: "Department not found." });
        }

        await Schedule.destroy({
            where: { AssignationId: { [Op.in]: department.Assignations.map(a => a.id) } }
        });

        const assignations = department.Assignations;
        const rooms = await Room.findAll();
        const professorSchedule = {};
        const courseSchedules = {};
        const report = [];

        // Ensure all professors and courses have their schedule initialized
        assignations.forEach(assignation => {
            const { Professor, Course } = assignation;

            if (!professorSchedule[Professor.id]) {
                professorSchedule[Professor.id] = {};
                for (let day = 1; day <= 5; day++) {
                    professorSchedule[Professor.id][day] = { hours: 0, dailyTimes: [] };
                }
            }

            if (!courseSchedules[Course.id]) {
                courseSchedules[Course.id] = {};
                for (let day = 1; day <= 5; day++) {
                    courseSchedules[Course.id][day] = [];
                }
            }
        });

        const success = await backtrackSchedule(assignations, rooms, professorSchedule, courseSchedules, 0, report, StartHour, EndHour);

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
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
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


// Get a specific Schedule by ID
const getSchedule = async (req, res, next) => {
    try {

        const schedule = await Schedule.findByPk(req.params.id, {
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    attributes: ['id', 'School_Year', 'Semester'],
                    include: [
                        {
                            model: Course,
                            attributes: ['Code', 'Description']
                        },
                        {
                            model: Professor,
                            attributes: ['id', 'Name']
                        }
                    ]
                },
                {
                    model: Room,
                    attributes: ['Code', 'Floor', 'Building', 'Type'],
                },
                {
                    model: ProgYrSec,
                    include: [
                        {
                            model: Program,
                            attributes: ['id', 'Code']
                        }
                    ],
                    through: { attributes: [] },
                    attributes: ['id', 'Year', 'Section']
                }
            ]
        });

        if (!schedule) {
            return res.status(404).json({ successful: false, message: "Schedule not found." });
        }

        return res.status(200).json({ successful: true, data: schedule });
    } catch (error) {
        return res.status(500).json({ successful: false, message: error.message || "An unexpected error; occurred." });
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
}

const getSchedsByRoom = async (req, res, next) => {
    try {
        const sched = await Schedule.findAll({
            where: { RoomId: req.params.id },
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    attributes: ['id', 'School_Year', 'Semester'],
                    include: [
                        {
                            model: Course,
                            attributes: ['Code', 'Description']
                        },
                        {
                            model: Professor,
                            attributes: ['Name']
                        }
                    ]
                },
                {
                    model: ProgYrSec,
                    include: [
                        {
                            model: Program,
                            attributes: ['Code']
                        }
                    ],
                    through: { attributes: [] },
                    attributes: ['id', 'Year', 'Section']
                }
            ]
        });

        if (!sched || sched.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No schedule found",
                count: 0,
                data: []
            });
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all schedules",
                count: sched.length,
                data: sched
            });
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const getSchedsByProf = async (req, res, next) => {
    try {
        const sched = await Schedule.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    where: { ProfessorId: req.params.id },
                    attributes: ['id', 'School_Year', 'Semester'],
                    include: [
                        {
                            model: Course,
                            attributes: ['Code', 'Description']
                        }
                    ]
                },
                {
                    model: Room,
                    attributes: ['Code', 'Floor', 'Building', 'Type'],
                },
                {
                    model: ProgYrSec,
                    include: [
                        {
                            model: Program,
                            attributes: ['Code']
                        }
                    ],
                    through: { attributes: [] },
                    attributes: ['id', 'Year', 'Section']
                }
            ]
        });

        if (!sched || sched.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No schedule found",
                count: 0,
                data: []
            });
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all schedules",
                count: sched.length,
                data: sched
            });
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}

const getSchedsByDept = async (req, res, next) => {
    try {
        const sched = await Schedule.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    where: { DepartmentId: req.params.id },
                    attributes: ['id', 'School_Year', 'Semester'],
                    include: [
                        {
                            model: Course,
                            attributes: ['Code', 'Description']
                        },
                        {
                            model: Professor,
                            attributes: ['id', 'Name']
                        },

                    ]
                },
                {
                    model: Room,
                    attributes: ['Code', 'Floor', 'Building', 'Type'],
                },
                {
                    model: ProgYrSec,
                    include: [
                        {
                            model: Program,
                            attributes: ['id', 'Code']
                        }
                    ],
                    through: { attributes: [] },
                    attributes: ['id', 'Year', 'Section']
                }
            ]
        });

        if (!sched || sched.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No schedule found",
                count: 0,
                data: []
            });
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all schedules",
                count: sched.length,
                data: sched
            });
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}


module.exports = {
    addSchedule,
    automateSchedule,
    getSchedule,
    getAllSchedules,
    updateSchedule,
    deleteSchedule,
    getSchedsByRoom,
    getSchedsByProf,
    getSchedsByDept
};
