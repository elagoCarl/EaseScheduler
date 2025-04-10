// Changed the Course into Course model because it is not being imported properly
const {  Settings, Schedule, Room, Assignation, Program, Professor, ProgYrSec, Department, Course } = require('../models');
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
    const requiredBreak = settings.nextScheduleBreak || 0.5; // Default break duration: 1 hour


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

    // enforce nextSchedule break
    for (let i = 0; i < intervals.length - 1; i++) {

        console.log("INTERVALS LIST: ", intervals);
        
        let currentEnd = intervals[i].end;
        let nextStart = intervals[i + 1].start;

        // Enforce a break after each schedule block
        if (nextStart < currentEnd + requiredBreak) {
            return false; // Not enough break time
        }
    }
    return true;                
};

const isSchedulePossible = (
    roomSchedules, professorSchedule, progYrSecSchedules,
    roomId, professorId, sectionIds, day, startHour, duration,
    settings,
    priorities // New parameter for priorities
) => {
    // Check if we're prioritizing a specific room and this isn't that room
    if (priorities?.room && priorities.room !== roomId) {
        return false;
    }
    
    // Check if we're prioritizing a specific professor and this isn't that professor
    if (priorities?.professor && priorities.professor !== professorId) {
        return false;
    }
    
    // Check if we're prioritizing specific sections and these don't match
    if (priorities?.sections && priorities.sections.length > 0) {
        const hasMatchingSection = sectionIds.some(id => priorities.sections.includes(id));
        if (!hasMatchingSection) return false;
    }

    // Original checks
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
    settings,
    priorities // New parameter for priorities
) => {
    // Base case: all assignations are scheduled
    if (index === assignations.length) return true;

    const assignation = assignations[index];
    const { Course: courseParam, Professor: professorInfo } = assignation;
    const duration = courseParam.Duration;

    let validProgYrSecs = [];
    
    try {
        // Determine valid sections for the course
        if (courseParam.Type === "Core") {
            validProgYrSecs = await ProgYrSec.findAll({ where: { Year: courseParam.Year } });
        } else if (courseParam.Type === "Professional") {
            const courseWithPrograms = await Course.findOne({
                where: { id: courseParam.id },
                include: { model: Program, as: 'CourseProgs', attributes: ['id'] }
            });

            if (courseWithPrograms && courseWithPrograms.CourseProgs.length) {
                const allowedProgramIds = courseWithPrograms.CourseProgs.map(program => program.id);
                validProgYrSecs = await ProgYrSec.findAll({
                    where: { Year: courseParam.Year, ProgramId: { [Op.in]: allowedProgramIds } }
                });
            }
        }
        if (!validProgYrSecs.length) return false;

        // If we're prioritizing sections, filter valid sections
        if (priorities?.sections && priorities.sections.length > 0) {
            validProgYrSecs = validProgYrSecs.filter(section => 
                priorities.sections.includes(section.id)
            );
            if (!validProgYrSecs.length) return false;
        }

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

                // If we have a prioritized room, use only that room
                const roomsToTry = priorities?.room ? 
                    rooms.filter(room => room.id === priorities.room) : 
                    rooms;

                for (const room of roomsToTry) {
                    let hour = startHour;

                    while (hour + duration <= endHour && scheduledHours < settings.StudentMaxHours) {
                        const sectionIds = group.map(sec => sec.id);

                        if (isSchedulePossible(
                            roomSchedules, professorSchedule, progYrSecSchedules,
                            room.id, professorInfo.id, sectionIds, day, hour, duration,
                            settings,
                            priorities // Pass the priorities
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

                            professorSchedule[professorInfo.id][day].hours += duration;
                            professorSchedule[professorInfo.id][day].dailyTimes.push({ start: hour, end: hour + duration });

                            courseSchedules[courseParam.id][day].push({ start: hour, end: hour + duration });

                            if (!roomSchedules[room.id]) roomSchedules[room.id] = {};
                            if (!roomSchedules[room.id][day]) roomSchedules[room.id][day] = [];
                            roomSchedules[room.id][day].push({ start: hour, end: hour + duration });

                            for (const section of group) {
                                progYrSecSchedules[section.id][day].hours += duration;
                                progYrSecSchedules[section.id][day].dailyTimes.push({ start: hour, end: hour + duration });
                            }

                            report.push({
                                Professor: professorInfo.Name,
                                Course: courseParam.Code,
                                CourseType: courseParam.Type,
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
                                startHour, endHour, settings, priorities
                            )) {
                                return true;
                            }

                            await createdSchedule.destroy();
                            professorSchedule[professorInfo.id][day].hours -= duration;
                            professorSchedule[professorInfo.id][day].dailyTimes.pop();

                            courseSchedules[courseParam.id][day].pop();
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
            index + 1, report, startHour, endHour, settings, priorities
        );

    } catch (error) {
        console.error("Error in backtrackSchedule:", error.message);
        return false;
    }
};

const automateSchedule = async (req, res, next) => {
    try {
        const { DepartmentId, prioritizedProfessor, prioritizedRoom, prioritizedSections } = req.body;
        if (!DepartmentId) {
            return res.status(400).json({ successful: false, message: "Department ID is required." });
        }

        // Create a priorities object based on the request body
        const priorities = {};
        if (prioritizedProfessor) {
            priorities.professor = prioritizedProfessor;
        }
        if (prioritizedRoom) {
            priorities.room = prioritizedRoom;
        }
        if (prioritizedSections && prioritizedSections.length) {
            priorities.sections = prioritizedSections;
        }

        const settings = await Settings.findByPk(1);
        const { StartHour, EndHour } = settings;
    
        const department = await Department.findByPk(DepartmentId, {
            include: [
                { 
                    model: Assignation, 
                    include: [
                        Course, 
                        { model: Professor, attributes: ['id', 'Name'] }
                    ] 
                },
                { model: Room, as: 'DeptRooms' }
            ]
        });

        if (!department) {
            return res.status(404).json({ successful: false, message: "Department not found." });
        }

        // Extract assignations and rooms from the department
        const assignations = department.Assignations;
        const rooms = department.DeptRooms;
        
        console.log(`Total assignations: ${assignations.length}`);
        console.log(`Total rooms: ${rooms.length}`);

        // If a specific professor is prioritized, prioritize assignations with that professor
        if (priorities.professor) {
            assignations.sort((a, b) => {
                if (a.Professor?.id === priorities.professor) return -1;
                if (b.Professor?.id === priorities.professor) return 1;
                return 0;
            });
        }

        // Fetch all existing schedules for these assignations
        const existingSchedules = await Schedule.findAll({
            where: { AssignationId: { [Op.in]: assignations.map(a => a.id) } }
        });
        
        console.log(`Existing schedules: ${existingSchedules.length}`);

        // Always delete all unlocked schedules
        const deletedCount = await Schedule.destroy({
            where: {
                AssignationId: { [Op.in]: assignations.map(a => a.id) },
                isLocked: false
            }
        });
        console.log(`Deleted ${deletedCount} unlocked schedules`);

        // Get all locked schedules to filter out assignations
        const lockedSchedules = existingSchedules.filter(schedule => schedule.isLocked);
        const lockedAssignationIds = new Set(lockedSchedules.map(schedule => schedule.AssignationId));

        // Only schedule assignations that don't have locked schedules
        const unscheduledAssignations = assignations.filter(assignation => 
            !lockedAssignationIds.has(assignation.id)
        );
        
        console.log(`Unscheduled assignations to process: ${unscheduledAssignations.length}`);
        unscheduledAssignations.forEach(a => {
            console.log(`- ${a.id}: ${a.Course?.Code || 'Unknown'} with ${a.Professor?.Name || 'Unknown'}`);
        });

        // Initialize tracking structures
        const professorSchedule = {};
        const courseSchedules = {};
        const progYrSecSchedules = {};
        const roomSchedules = {};
        const report = [];
        const failedAssignations = [];

        // Initialize professor and course schedules
        assignations.forEach(assignation => {
            const { Professor: professorInfo, Course: courseInfo } = assignation;
            if (!professorInfo || !courseInfo) {
                return;
            }
            
            if (!professorSchedule[professorInfo.id]) {
                professorSchedule[professorInfo.id] = {};
                for (let day = 1; day <= 5; day++) {
                    professorSchedule[professorInfo.id][day] = { hours: 0, dailyTimes: [] };
                }
            }
            
            if (!courseSchedules[courseInfo.id]) {
                courseSchedules[courseInfo.id] = {};
                for (let day = 1; day <= 5; day++) {
                    courseSchedules[courseInfo.id][day] = [];
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

        // Process locked schedules data into the tracking structures
        for (const schedule of lockedSchedules) {
            const associatedPYS = await schedule.getProgYrSecs();
            const assignation = await Assignation.findByPk(schedule.AssignationId, {
                include: [Course, Professor]
            });

            if (!assignation || !assignation.Course || !assignation.Professor) continue;

            const { Course: courseInfo, Professor: professorInfo } = assignation;
            const day = schedule.Day;

            // Parse start and end times to hours
            const startTimeHour = parseInt(schedule.Start_time.split(':')[0]);
            const endTimeHour = parseInt(schedule.End_time.split(':')[0]);
            const duration = endTimeHour - startTimeHour;

            // Update professor schedule
            professorSchedule[professorInfo.id][day].hours += duration;
            professorSchedule[professorInfo.id][day].dailyTimes.push({
                start: startTimeHour,
                end: endTimeHour
            });

            // Update course schedule
            courseSchedules[courseInfo.id][day].push({
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
                if (!progYrSecSchedules[section.id]) {
                    progYrSecSchedules[section.id] = {};
                }
                if (!progYrSecSchedules[section.id][day]) {
                    progYrSecSchedules[section.id][day] = { hours: 0, dailyTimes: [] };
                }
                progYrSecSchedules[section.id][day].hours += duration;
                progYrSecSchedules[section.id][day].dailyTimes.push({
                    start: startTimeHour,
                    end: endTimeHour
                });
            }
        }

        // Call backtracking only on unscheduled assignations
        console.log(`Starting backtracking algorithm with ${unscheduledAssignations.length} assignations...`);
        const success = await backtrackSchedule(
            unscheduledAssignations, rooms, professorSchedule, courseSchedules,
            progYrSecSchedules, roomSchedules, 0, report,
            StartHour, EndHour, settings, priorities, failedAssignations
        );

        // Log remaining assignations for debugging
        const scheduledAssignationCount = report.length;
        console.log(`Scheduled ${scheduledAssignationCount} assignations`);
        console.log(`Failed to schedule ${failedAssignations.length} assignations`);

        // Get all scheduled assignations for final report
        const allSchedules = await Schedule.findAll({
            where: { AssignationId: { [Op.in]: assignations.map(a => a.id) } },
            include: [
                { model: Assignation, include: [Course, Professor] },
                { model: Room },
                { model: ProgYrSec }
            ]
        });
        
        const fullReport = allSchedules.map(schedule => {
            const assignation = schedule.Assignation;
            if (!assignation || !assignation.Course || !assignation.Professor) return null;
            
            return {
                Professor: assignation.Professor.Name,
                Course: assignation.Course.Code,
                CourseType: assignation.Course.Type,
                Sections: schedule.ProgYrSecs.map(sec => 
                    `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`),
                Room: schedule.Room.Code,
                Day: schedule.Day,
                Start_time: schedule.Start_time,
                End_time: schedule.End_time,
                isLocked: schedule.isLocked
            };
        }).filter(Boolean);

        return res.status(200).json({
            successful: true,
            message: priorities.professor || priorities.room || priorities.sections ? 
                `Schedule automation completed with prioritization. Scheduled ${scheduledAssignationCount} assignations.` :
                `Schedule automation completed. Scheduled ${scheduledAssignationCount} assignations.`,
            totalSchedules: fullReport.length,
            newSchedules: report.length,
            scheduleReport: report,
            fullScheduleReport: fullReport,
            failedAssignations: failedAssignations,
            prioritiesApplied: Object.keys(priorities).length > 0 ? priorities : null
        });

    } catch (error) {
        console.error("Error in automateSchedule:", error);
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Add Schedule (Manual Version of automateSchedule)
const addSchedule = async (req, res, next) => {
    try {
        let schedule = req.body;

        if (!Array.isArray(schedule)) {
            schedule = [schedule];
        }

        const createdSchedules = [];
        const failedSchedules = [];

        for (const sched of schedule) {
            const { Day, Start_time, RoomId, AssignationId, DepartmentId, isLocked } = sched;

            // Validate mandatory fields
            if (!util.checkMandatoryFields([Day, Start_time, RoomId, AssignationId, DepartmentId, isLocked])) {
                failedSchedules.push({ ...sched, reason: "A mandatory field is missing." });
                continue;
            }

            // Validate time format
            if (isValidTime(Start_time, "23:59", res) !== true) continue;

            const department = await Department.findByPk(DepartmentId, {
                include: [
                    { model: Assignation, include: [Course, Professor] },
                    // DeptRooms is a bridge table. Needs unique identifier.
                    { model: Room, as: 'DeptRooms' }
                ]
            });

            const room = department.DeptRooms

            // if (!room || room.DeptRooms.length === 0) { // Ensure the room is associated with the correct department
            //     failedSchedules.push({ ...sched, reason: `Room with ID ${RoomId} not found or does not belong to Department ${DepartmentId}.` });
            //     continue;
            // }

        
            // Validate Assignation existence
            const assignation = await Assignation.findByPk(AssignationId, { include: [Course] });
            if (!assignation || !assignation.Course) {
                failedSchedules.push({ ...sched, reason: `Assignation with ID ${AssignationId} not found or missing course details.` });
                continue;
            }

            // Calculate End_time using course duration
            const duration = assignation.Course.Duration; // Assuming duration is in hours
            const [startHour, startMin] = Start_time.split(":").map(Number);
            const endHour = startHour + duration;
            const End_time = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

            // Check for conflicting schedules in the same room on the same day
            const existingSchedules = await Schedule.findAll({ where: { Day, RoomId } });
            const isConflict = existingSchedules.some(existing => {
                return (
                    (Start_time >= existing.Start_time && Start_time < existing.End_time) ||
                    (End_time > existing.Start_time && End_time <= existing.End_time) ||
                    (Start_time <= existing.Start_time && End_time >= existing.End_time)
                );
            });

            if (isConflict) {
                failedSchedules.push({ ...sched, reason: `Schedule conflict detected: Room ${RoomId} is already booked on ${Day} within ${Start_time} - ${End_time}.` });
                continue;
            }

            // Create schedule
            const newSchedule = await Schedule.create({ Day, Start_time, End_time, RoomId, AssignationId, isLocked });
            createdSchedules.push(newSchedule);
        }

        return res.status(201).json({
            successful: createdSchedules.length > 0,
            message: createdSchedules.length > 0 ? "Successfully created schedules." : "No schedules were created.",
            schedules: createdSchedules,
            failedSchedules: failedSchedules.length > 0 ? failedSchedules : undefined
        });

    } catch (error) {
        console.error(error);
        next(error.message);
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