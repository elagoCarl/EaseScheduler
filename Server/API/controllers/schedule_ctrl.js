// Changed the Course into Course model because it is not being imported properly
const { Settings, Schedule, Room, Assignation, Program, Professor, Course, ProgYrSec, Department, Course: CourseModel } = require('../models');
const { Op } = require('sequelize');
const util = require("../../utils");
const { json } = require('body-parser');


// HELPER FUNCTIONS

const isValidTime = (startTime, endTime, res) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    // Validate format
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return res.status(400).json({
            successful: false,
            message: "Invalid time format. Please use HH:mm in 24-hour format."
        });
    }

    // Ensure start time is earlier than end time
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    if (startHours > endHours || (startHours === endHours && startMinutes >= endMinutes)) {
        return res.status(400).json({
            successful: false,
            message: "Start time must be earlier than end time."
        });
    }

    return true;
};

/**
 * Helper function to check room availability.
 */
const isRoomAvailable = (roomSchedules, roomId, day, startHour, duration) => {
    if (!roomSchedules[roomId] || !roomSchedules[roomId][day]) return true;

    return !roomSchedules[roomId][day].some(time =>
        (startHour >= time.start && startHour < time.end) ||
        (startHour + duration > time.start && startHour + duration <= time.end) ||
        (startHour <= time.start && startHour + duration >= time.end)
    );
};

/**
 * Check if a professor can be scheduled based on hours, conflicts, and break enforcement.
 */
const canScheduleProfessor = (profSchedule, startHour, duration, settings) => {
    const requiredBreak = settings.ProfessorBreak || 1; // Default break duration: 1 hour
    const maxContinuousHours = settings.maxAllowedGap; // Max hours before break is required

    if (profSchedule.hours + duration > settings.ProfessorMaxHours) return false;

    // Check for overlapping schedules
    for (const time of profSchedule.dailyTimes) {
        if (
            (startHour >= time.start && startHour < time.end) ||
            (startHour + duration > time.start && startHour + duration <= time.end) ||
            (startHour <= time.start && startHour + duration >= time.end)
        ) {
            return false;
        }
    }

    // Sort schedules by start time to find contiguous blocks
    const intervals = [...profSchedule.dailyTimes, { start: startHour, end: startHour + duration }]
        .sort((a, b) => a.start - b.start);

    let contiguousStart = intervals[0].start;
    let contiguousEnd = intervals[0].end;

    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i].start === contiguousEnd) {
            contiguousEnd = intervals[i].end;
        } else {
            // If a contiguous block exceeds the max hours, enforce a break
            if (contiguousEnd - contiguousStart >= maxContinuousHours) {
                let requiredBreakEnd = contiguousEnd + requiredBreak;
                if (startHour < requiredBreakEnd) return false;
            }
            contiguousStart = intervals[i].start;
            contiguousEnd = intervals[i].end;
        }
    }

    return true;
};

/**
 * Check if students in a section can be scheduled based on hours, conflicts, and break enforcement.
 */
const canScheduleStudents = (secSchedule, startHour, duration, settings) => {
    const requiredBreak = settings.StudentBreak || 1; // Default break duration: 1 hour
    const maxContinuousHours = settings.maxAllowedGap; // Max hours before break is required

    if (secSchedule.hours + duration > settings.StudentMaxHours) return false;

    // Check for overlapping schedules
    for (const time of secSchedule.dailyTimes) {
        if (
            (startHour >= time.start && startHour < time.end) ||
            (startHour + duration > time.start && startHour + duration <= time.end) ||
            (startHour <= time.start && startHour + duration >= time.end)
        ) {
            return false;
        }
    }

    // Sort schedules by start time to find contiguous blocks
    const intervals = [...secSchedule.dailyTimes, { start: startHour, end: startHour + duration }]
        .sort((a, b) => a.start - b.start);

    let contiguousStart = intervals[0].start;
    let contiguousEnd = intervals[0].end;

    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i].start === contiguousEnd) {
            contiguousEnd = intervals[i].end;
        } else {
            // If a contiguous block exceeds the max hours, enforce a break
            if (contiguousEnd - contiguousStart >= maxContinuousHours) {
                let requiredBreakEnd = contiguousEnd + requiredBreak;
                if (startHour < requiredBreakEnd) return false;
            }
            contiguousStart = intervals[i].start;
            contiguousEnd = intervals[i].end;
        }
    }

    return true;
};

/**
 * Check if a schedule is possible based on room, professor, and student availability.
 */
const isSchedulePossible = (
    roomSchedules, professorSchedule, progYrSecSchedules,
    roomId, professorId, sectionIds, day, startHour, duration,
    settings
) => {
    if (!isRoomAvailable(roomSchedules, roomId, day, startHour, duration)) return false;

    // Check professor's schedule constraints (including the required break)
    if (!canScheduleProfessor(professorSchedule[professorId][day], startHour, duration, settings)) return false;

    // Check each progYrSec's schedule constraints
    for (const sectionId of sectionIds) {
        if (!canScheduleStudents(progYrSecSchedules[sectionId][day], startHour, duration, settings)) return false;
    }

    return true;
};




const backtrackSchedule = async (
    assignations,
    rooms,
    professorSchedule,
    courseSchedules,
    progYrSecSchedules,
    roomSchedules,
    index,
    report,
    startHour,
    endHour,
    settings
) => {
    // Base case: all assignations are scheduled
    if (index === assignations.length) return true;

    const assignation = assignations[index];
    const { Course, Professor } = assignation;
    const duration = Course.Duration;

    let validProgYrSecs = [];
    try {
        // Determine valid sections for the course
        if (Course.Type === "Core") {
            validProgYrSecs = await ProgYrSec.findAll({ where: { Year: Course.Year } });
        } else if (Course.Type === "Professional") {
            const courseWithPrograms = await CourseModel.findOne({
                where: { id: Course.id },
                include: { model: Program, as: 'CourseProgs', attributes: ['id'] }
            });

            if (courseWithPrograms && courseWithPrograms.CourseProgs.length) {
                const allowedProgramIds = courseWithPrograms.CourseProgs.map(program => program.id);
                validProgYrSecs = await ProgYrSec.findAll({
                    where: { Year: Course.Year, ProgramId: { [Op.in]: allowedProgramIds } }
                });
            }
        }
        if (!validProgYrSecs.length) return false;

        // Group sections by Program-Year to attempt full-day scheduling
        const sectionGroups = {};
        validProgYrSecs.forEach(section => {
            const key = `${section.ProgramId}-${section.Year}`;
            if (!sectionGroups[key]) sectionGroups[key] = [];
            sectionGroups[key].push(section);
        });

        // Try scheduling each section group efficiently
        for (const groupKey in sectionGroups) {
            const group = sectionGroups[groupKey];

            const allDays = [1, 2, 3, 4, 5];
            const daysWithCourses = allDays.filter(day => progYrSecSchedules[group[0].id][day].hours > 0);
            const daysWithoutCourses = allDays.filter(day => progYrSecSchedules[group[0].id][day].hours === 0);
            const days = daysWithCourses.concat(daysWithoutCourses);

            for (const day of days) {
                let scheduledHours = 0;

                for (const room of rooms) {
                    let hour = startHour;

                    while (hour + duration <= endHour && scheduledHours < settings.StudentMaxHours) {
                        const sectionIds = group.map(sec => sec.id);

                        if (isSchedulePossible(
                            roomSchedules, professorSchedule, progYrSecSchedules,
                            room.id, Professor.id, sectionIds, day, hour, duration,
                            settings
                        )) {
                            const createdSchedule = await Schedule.create({
                                Day: day,
                                Start_time: `${hour}:00`,
                                End_time: `${hour + duration}:00`,
                                RoomId: room.id,
                                AssignationId: assignation.id,
                                isLocked: false
                            });

                            await createdSchedule.addProgYrSecs(group);

                            professorSchedule[Professor.id][day].hours += duration;
                            professorSchedule[Professor.id][day].dailyTimes.push({ start: hour, end: hour + duration });

                            courseSchedules[Course.id][day].push({ start: hour, end: hour + duration });

                            if (!roomSchedules[room.id]) roomSchedules[room.id] = {};
                            if (!roomSchedules[room.id][day]) roomSchedules[room.id][day] = [];
                            roomSchedules[room.id][day].push({ start: hour, end: hour + duration });

                            for (const section of group) {
                                progYrSecSchedules[section.id][day].hours += duration;
                                progYrSecSchedules[section.id][day].dailyTimes.push({ start: hour, end: hour + duration });
                            }

                            report.push({
                                Professor: Professor.Name,
                                Course: Course.Code,
                                CourseType: Course.Type,
                                Sections: group.map(sec => `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`),
                                Room: room.Code,
                                Day: day,
                                Start_time: `${hour}:00`,
                                End_time: `${hour + duration}:00`
                            });

                            hour += duration;
                            scheduledHours += duration;

                            if (await backtrackSchedule(
                                assignations, rooms, professorSchedule, courseSchedules,
                                progYrSecSchedules, roomSchedules, index + 1, report,
                                startHour, endHour, settings
                            )) {
                                return true;
                            }

                            await createdSchedule.destroy();
                            professorSchedule[Professor.id][day].hours -= duration;
                            professorSchedule[Professor.id][day].dailyTimes.pop();

                            courseSchedules[Course.id][day].pop();
                            roomSchedules[room.id][day].pop();

                            for (const section of group) {
                                progYrSecSchedules[section.id][day].hours -= duration;
                                progYrSecSchedules[section.id][day].dailyTimes.pop();
                            }

                            report.pop();
                        } else {
                            hour += duration;
                        }
                    }

                    if (scheduledHours >= settings.StudentMaxHours) break;
                }
            }
        }

        return await backtrackSchedule(
            assignations, rooms, professorSchedule, courseSchedules, progYrSecSchedules, roomSchedules,
            index + 1, report, startHour, endHour, settings
        );

    } catch (error) {
        console.error("Error in backtrackSchedule:", error);
        return false;
    }
};

const automateSchedule = async (req, res, next) => {
    try {

        const { DepartmentId } = req.body;

        if (!DepartmentId) {
            return res.status(400).json({ successful: false, message: "Department ID is required." });
        }

        // why is the settings here?
        const settings = await Settings.findByPk(1);

        // this can be moved to other functions?
        const { StartHour, EndHour } = settings;

        const department = await Department.findByPk(DepartmentId, {
            include: [
                { model: Assignation, include: [Course, Professor] },
                // DeptRooms is a bridge table. Needs unique identifier.
                { model: Room, as: 'DeptRooms' }
            ]
        });


        if (!department) {
            return res.status(404).json({ successful: false, message: "Department not found." });
        }

        // Extract assignations and rooms from the department
        const assignations = department.Assignations;
        const rooms = department.DeptRooms;

        // Fetch all existing schedules for these assignations
        const existingSchedules = await Schedule.findAll({
            where: { AssignationId: { [Op.in]: assignations.map(a => a.id) } }
        });


        await Schedule.destroy({
            where: {
                AssignationId: { [Op.in]: assignations.map(a => a.id) },
                isLocked: false
            }
        });


        // Filter out assignations that are already scheduled when overwrite is 0
        const lockedAssignationIds = new Set(existingSchedules
            .filter(schedule => schedule.isLocked)
            .map(schedule => schedule.AssignationId)
        );

        console.log("LOCKED ASSIGNATIONS: ", lockedAssignationIds)

        const unscheduledAssignations = assignations.filter(assignation =>
            !lockedAssignationIds.has(assignation.id)
        );

        console.log("UNLOCKED ASSIGNATIONS: ", unscheduledAssignations)
        // Initialize tracking structures

        const professorSchedule = {};
        const courseSchedules = {};
        const progYrSecSchedules = {};
        const roomSchedules = {};
        const report = [];
        const failedAssignations = [];

        // Initialize professor and course schedules
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

        // Pre-fetch all ProgYrSec entities
        const allProgYrSecs = await ProgYrSec.findAll();

        // Initialize ProgYrSec schedules
        allProgYrSecs.forEach(section => {
            progYrSecSchedules[section.id] = {};
            for (let day = 1; day <= 5; day++) {
                progYrSecSchedules[section.id][day] = { hours: 0, dailyTimes: [] };
            }
        });

        // Load existing schedules into tracking structures if not overwriting

        // Process existing schedules data into the tracking structures
        for (const schedule of existingSchedules) {
            const associatedPYS = await schedule.getProgYrSecs();
            const assignation = await Assignation.findByPk(schedule.AssignationId, {
                include: [Course, Professor]
            });

            if (!assignation) continue;

            const { Course, Professor } = assignation;
            const day = schedule.Day;

            // Parse start and end times to hours
            const startTimeHour = parseInt(schedule.Start_time.split(':')[0]);
            const endTimeHour = parseInt(schedule.End_time.split(':')[0]);
            const duration = endTimeHour - startTimeHour;

            // Update professor schedule
            professorSchedule[Professor.id][day].hours += duration;
            professorSchedule[Professor.id][day].dailyTimes.push({
                start: startTimeHour,
                end: endTimeHour
            });

            // Update course schedule
            courseSchedules[Course.id][day].push({
                start: startTimeHour,
                end: endTimeHour
            });

            // Update room schedule
            if (!roomSchedules[schedule.RoomId]) roomSchedules[schedule.RoomId] = {};
            if (!roomSchedules[schedule.RoomId][day]) roomSchedules[schedule.RoomId][day] = [];
            roomSchedules[schedule.RoomId][day].push({
                start: startTimeHour,
                end: endTimeHour
            });

            // Update progYrSec schedules
            for (const section of associatedPYS) {
                progYrSecSchedules[section.id][day].hours += duration;
                progYrSecSchedules[section.id][day].dailyTimes.push({
                    start: startTimeHour,
                    end: endTimeHour
                });
            }
        }


        // Call backtracking only on unscheduled assignations
        const success = await backtrackSchedule(
            unscheduledAssignations, rooms, professorSchedule, courseSchedules,
            progYrSecSchedules, roomSchedules, 0, report,
            StartHour, EndHour, settings, failedAssignations
        );

        // Log remaining assignations for debugging
        const remainingAssignations = unscheduledAssignations.filter(assignation =>
            !report.some(entry => entry.Course === assignation.Course.Code)
        );

        remainingAssignations.forEach(assignation => {
            console.log(`assignation: ${assignation.id}`);
        });

        if (!success && failedAssignations.length > 0) {
            return res.status(400).json({
                successful: false,
                message: "Unable to generate a valid schedule with the given constraints.",
                failedAssignations: failedAssignations
            });
        }

        return res.status(200).json({
            successful: true,
            message: "Schedule automated successfully.",
            scheduleReport: report,
            failedAssignations: failedAssignations.length > 0 ? failedAssignations : undefined
        });

    } catch (error) {
        console.error("Error in automateSchedule:", error);
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

const automateRoomSpecificSchedule = async (req, res) => {
    try {
        const { roomIds } = req.body;
        if (!Array.isArray(roomIds) || roomIds.length === 0) {
            return res.status(400).json({
                successful: false,
                message: "invalid or missing room id"
            });
        }

        // Fetch all necessary data
        const settings = await Settings.findByPk(1);

        const { StartHour, EndHour } = settings;

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message
        });
    }
};

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
        return json.status(500).json({ successful: false, message: error.message || "An unexpected error; occurred." });
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
                    attributes: ['Year', 'Section']
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
                        },
                        {
                            model: Room,
                            attributes: ['Code', 'Floor', 'Building', 'Type'],
                            through: { attributes: [] }
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
                    attributes: ['Year', 'Section']
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
                        {
                            model: Room,
                            attributes: ['Code', 'Floor', 'Building', 'Type'],
                            through: { attributes: [] }
                        }
                    ]
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
                    attributes: ['Year', 'Section']
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

            // Validate time format and sequence
            if (isValidTime(Start_time, End_time, res) !== true) return;

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
                    (Start_time >= existing.Start_time && Start_time < existing.End_time) ||
                    (End_time > existing.Start_time && End_time <= existing.End_time) ||
                    (Start_time <= existing.Start_time && End_time >= existing.End_time)
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
        console.error(error);
        next(error.message);
    }
};

// Update Schedule
const updateSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Day, Start_time, End_time, RoomId, AssignationId } = req.body;

        // Validate mandatory fields
        if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId])) {
            return res.status(400).json({ successful: false, message: "A mandatory field is missing." });
        }

        // Validate time format and sequence
        if (isValidTime(Start_time, End_time, res) !== true) return;

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
                (Start_time >= existing.Start_time && Start_time < existing.End_time) ||
                (End_time > existing.Start_time && End_time <= existing.End_time) ||
                (Start_time <= existing.Start_time && End_time >= existing.End_time)
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
        console.error(error);
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
    automateRoomSpecificSchedule,
    getSchedule,
    getAllSchedules,
    updateSchedule,
    deleteSchedule,
    getSchedsByRoom,
    getSchedsByProf,
    getSchedsByDept
};