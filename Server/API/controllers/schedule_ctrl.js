// Import required models and dependencies
const { Settings, Schedule, Room, Assignation, Program, Professor, ProgYrSec, Department, Course, ProfAvail } = require('../models');
const { Op } = require('sequelize');
const util = require("../../utils");
const { json } = require('body-parser');

// HELPER FUNCTIONS

const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      const [hours, minutes] = parts;
      return hours * 3600 + minutes * 60;
    } else {
      throw new Error("Invalid time format: expected HH:MM or HH:MM:SS");
    }
};

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

const isRoomAvailable = (roomSchedules, roomId, day, startHour, duration) => {
    if (!roomSchedules[roomId] || !roomSchedules[roomId][day]) return true;

    return !roomSchedules[roomId][day].some(time =>
        (startHour >= time.start && startHour < time.end) ||
        (startHour + duration > time.start && startHour + duration <= time.end) ||
        (startHour <= time.start && startHour + duration >= time.end)
    );
};

const canScheduleProfessor = async (profSchedule, startHour, duration, settings, professorId, day) => {
    const requiredBreak = settings.ProfessorBreak || 1; // Default break duration: 1 hour
    const maxContinuousHours = settings.maxAllowedGap; // Max hours before break is required

    // First check if the professor has availability records for this day
    const profAvails = await ProfAvail.findAll({
        where: {
            ProfessorId: professorId,
            // Check both numeric and string representations of day
            [Op.or]: [
                { Day: day.toString() },
                { Day: convertDayNumberToName(day) } // Helper function to convert 1→"Monday", etc.
            ]
        }
    });
    
    // If the professor has availability records but none for this day, they're unavailable
    if (profAvails.length === 0) {
        // Check if this professor has ANY availability records
        const anyAvailRecords = await ProfAvail.count({
            where: { ProfessorId: professorId }
        });
        
        // If the professor has availability records but none for this day, they're unavailable
        if (anyAvailRecords > 0) return false;
    } else {
        // If they have records for this day, check if the proposed time falls within any availability window
        let isAvailable = false;
        for (const avail of profAvails) {
            const availStartHour = parseInt(avail.Start_time.split(':')[0]);
            const availEndHour = parseInt(avail.End_time.split(':')[0]);
            
            if (startHour >= availStartHour && (startHour + duration) <= availEndHour) {
                isAvailable = true;
                break;
            }
        }
        
        if (!isAvailable) return false;
    }

    // Check if adding this schedule would exceed max hours
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

    // If no schedules yet, no need to check for contiguous blocks
    if (profSchedule.dailyTimes.length === 0) {
        return true;
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
                if (intervals[i].start < requiredBreakEnd) return false;
            }
            contiguousStart = intervals[i].start;
            contiguousEnd = intervals[i].end;
        }
    }

    return true;
};

// Helper function to convert day numbers to names
function convertDayNumberToName(dayNumber) {
    const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNumber] || "";
}

// Helper function to convert day numbers to names (duplicate exists if needed for context)
function convertDayNumberToName(dayNumber) {
    const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNumber] || "";
}

/**
 * Check if students in a section can be scheduled based on hours, conflicts, and break enforcement.
 */
const canScheduleStudents = (secSchedule, startHour, duration, settings) => {
    const requiredBreak = settings.nextScheduleBreak || 0.5; // Default break duration

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

    // Sort schedules by start time to find contiguous blocks and enforce required break
    const intervals = [...secSchedule.dailyTimes, { start: startHour, end: startHour + duration }]
        .sort((a, b) => a.start - b.start);

    for (let i = 0; i < intervals.length - 1; i++) {
        let currentEnd = intervals[i].end;
        let nextStart = intervals[i + 1].start;

        if (nextStart < currentEnd + requiredBreak) {
            return false; // Not enough break time
        }
    }
    return true;
};

/**
 * Check if the schedule is possible for a given room, professor, and sections based on the constraints.
 */
const isSchedulePossible = async (
    roomSchedules, professorSchedule, progYrSecSchedules,
    roomId, professorId, sectionIds, day, startHour, duration,
    settings,
    priorities // New parameter for priorities
) => {
    // Check if we're prioritizing a specific room
    if (priorities?.room && !priorities.room.includes(roomId)) {
        return false;
    }
    
    // Check if we're prioritizing a specific professor
    if (priorities?.professor && !priorities.professor.includes(professorId)) {
        return false;
    }
    
    // Check if we're prioritizing specific sections and these don't match
    if (priorities?.sections && priorities.sections.length > 0) {
        const hasMatchingSection = sectionIds.some(id => priorities.sections.includes(id));
        if (!hasMatchingSection) return false;
    }

    // Original constraint checks
    if (!isRoomAvailable(roomSchedules, roomId, day, startHour, duration)) return false;

    if (!await canScheduleProfessor(professorSchedule[professorId][day], startHour, duration, settings, professorId, day)) return false;

    for (const sectionId of sectionIds) {
        if (!canScheduleStudents(progYrSecSchedules[sectionId][day], startHour, duration, settings)) return false;
    }

    return true;
};

/**
 * Backtracking function which recursively attempts to schedule each assignation.
 */
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
    priorities,
    failedAssignations // This parameter tracks failed assignations
) => {
    // Base case: all assignations are scheduled
    if (index === assignations.length) return true;

    const assignation = assignations[index];
    const { Course: courseParam, Professor: professorInfo } = assignation;
    const duration = courseParam.Duration;

    let validProgYrSecs = [];
    let assignationSuccessfullyScheduled = false;
    
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
        if (!validProgYrSecs.length) {
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo.Name,
                reason: "No valid sections found"
            });
            return await backtrackSchedule(
                assignations, rooms, professorSchedule, courseSchedules, progYrSecSchedules, roomSchedules,
                index + 1, report, startHour, endHour, settings, priorities, failedAssignations
            );
        }

        // If prioritizing sections, filter valid sections
        if (priorities?.sections && priorities.sections.length > 0) {
            validProgYrSecs = validProgYrSecs.filter(section => 
                priorities.sections.includes(section.id)
            );
            if (!validProgYrSecs.length) {
                failedAssignations.push({
                    id: assignation.id,
                    Course: courseParam.Code,
                    Professor: professorInfo.Name,
                    reason: "No sections match the priority filter"
                });
                return await backtrackSchedule(
                    assignations, rooms, professorSchedule, courseSchedules, progYrSecSchedules, roomSchedules,
                    index + 1, report, startHour, endHour, settings, priorities, failedAssignations
                );
            }
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
            const allDays = [1, 2, 3, 4, 5, 6];
            // Choose days based on existing courses first, then days without courses
            const daysWithCourses = allDays.filter(day => progYrSecSchedules[group[0].id][day].hours > 0);
            const daysWithoutCourses = allDays.filter(day => progYrSecSchedules[group[0].id][day].hours === 0);
            const days = daysWithCourses.concat(daysWithoutCourses);

            for (const day of days) {
                let scheduledHours = 0;

                // If a prioritized room is specified, filter accordingly
                const roomsToTry = priorities?.room ? 
                    rooms.filter(room => priorities.room.includes(room.id)) : 
                    rooms;

                for (const room of roomsToTry) {
                    let hour = startHour;

                    while (hour + duration <= endHour && scheduledHours < settings.StudentMaxHours) {
                        const sectionIds = group.map(sec => sec.id);

                        if (await isSchedulePossible(
                            roomSchedules, professorSchedule, progYrSecSchedules,
                            room.id, professorInfo.id, sectionIds, day, hour, duration,
                            settings,
                            priorities
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
                            assignationSuccessfullyScheduled = true;

                            if (await backtrackSchedule(
                                assignations, rooms, professorSchedule, courseSchedules,
                                progYrSecSchedules, roomSchedules, index + 1, report,
                                startHour, endHour, settings, priorities, failedAssignations
                            )) {
                                return true;
                            }

                            // Backtrack if not successful
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
                            assignationSuccessfullyScheduled = false;
                        } else {
                            hour += duration;
                        }
                    }
                    if (scheduledHours >= settings.StudentMaxHours) break;
                }
            }
        }

        if (!assignationSuccessfullyScheduled) {
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo.Name,
                reason: "No valid time slot found with given constraints"
            });
        }

        return await backtrackSchedule(
            assignations, rooms, professorSchedule, courseSchedules, progYrSecSchedules, roomSchedules,
            index + 1, report, startHour, endHour, settings, priorities, failedAssignations
        );

    } catch (error) {
        console.error("Error in backtrackSchedule:", error.message);
        failedAssignations.push({
            id: assignation.id,
            Course: courseParam.Code,
            Professor: professorInfo.Name,
            reason: `Error: ${error.message}`
        });
        return await backtrackSchedule(
            assignations, rooms, professorSchedule, courseSchedules, progYrSecSchedules, roomSchedules,
            index + 1, report, startHour, endHour, settings, priorities, failedAssignations
        );
    }
};

/**
 * Main function to automate the schedule.
 */
const automateSchedule = async (req, res, next) => {
    try {
        const { DepartmentId, prioritizedProfessor, prioritizedRoom, prioritizedSections } = req.body;
        if (!DepartmentId) {
            return res.status(400).json({ successful: false, message: "Department ID is required." });
        }

        // Normalize priorities: always treat professor and room inputs as arrays.
        const priorities = {};
        if (prioritizedProfessor) {
            priorities.professor = Array.isArray(prioritizedProfessor) ? prioritizedProfessor : [prioritizedProfessor];
        }
        if (prioritizedRoom) {
            priorities.room = Array.isArray(prioritizedRoom) ? prioritizedRoom : [prioritizedRoom];
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

        // Sort assignations so that those with prioritized professors come first
        if (priorities.professor) {
            assignations.sort((a, b) => {
                const aIsPrioritized = priorities.professor.includes(a.Professor?.id);
                const bIsPrioritized = priorities.professor.includes(b.Professor?.id);
                return (bIsPrioritized === aIsPrioritized) ? 0 : (bIsPrioritized ? 1 : -1);
            });
        }

        // Fetch existing schedules for these assignations
        const existingSchedules = await Schedule.findAll({
            where: { AssignationId: { [Op.in]: assignations.map(a => a.id) } }
        });
        
        console.log(`Existing schedules: ${existingSchedules.length}`);

        // Delete all unlocked schedules
        const deletedCount = await Schedule.destroy({
            where: {
                AssignationId: { [Op.in]: assignations.map(a => a.id) },
                isLocked: false
            }
        });
        console.log(`Deleted ${deletedCount} unlocked schedules`);

        // Filter out assignations with locked schedules
        const lockedSchedules = existingSchedules.filter(schedule => schedule.isLocked);
        const lockedAssignationIds = new Set(lockedSchedules.map(schedule => schedule.AssignationId));

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
              for (let day = 1; day <= 6; day++) {  // Now days 1-6 (Monday–Saturday)
                professorSchedule[professorInfo.id][day] = { hours: 0, dailyTimes: [] };
              }
            }
            
            if (!courseSchedules[courseInfo.id]) {
              courseSchedules[courseInfo.id] = {};
              for (let day = 1; day <= 6; day++) { // Now days 1-6
                courseSchedules[courseInfo.id][day] = [];
              }
            }
          });

          const allProgYrSecs = await ProgYrSec.findAll();
          allProgYrSecs.forEach(section => {
              progYrSecSchedules[section.id] = {};
              for (let day = 1; day <= 6; day++) {  // Now days 1-6
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
            const startTimeHour = parseInt(schedule.Start_time.split(':')[0]);
            const endTimeHour = parseInt(schedule.End_time.split(':')[0]);
            const duration = endTimeHour - startTimeHour;

            professorSchedule[professorInfo.id][day].hours += duration;
            professorSchedule[professorInfo.id][day].dailyTimes.push({
                start: startTimeHour,
                end: endTimeHour
            });

            courseSchedules[courseInfo.id][day].push({
                start: startTimeHour,
                end: endTimeHour
            });

            if (!roomSchedules[schedule.RoomId]) roomSchedules[schedule.RoomId] = {};
            if (!roomSchedules[schedule.RoomId][day]) roomSchedules[schedule.RoomId][day] = [];
            roomSchedules[schedule.RoomId][day].push({
                start: startTimeHour,
                end: endTimeHour
            });

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

        console.log(`Starting backtracking algorithm with ${unscheduledAssignations.length} assignations...`);
        const success = await backtrackSchedule(
            unscheduledAssignations, rooms, professorSchedule, courseSchedules,
            progYrSecSchedules, roomSchedules, 0, report,
            StartHour, EndHour, settings, priorities, failedAssignations
        );

        const scheduledAssignationCount = report.length;
        console.log(`Scheduled ${scheduledAssignationCount} assignations`);
        console.log(`Failed to schedule ${failedAssignations.length} assignations`);
        failedAssignations.forEach(failed => {
            console.log(`- Failed: ${failed.Course} with ${failed.Professor}: ${failed.reason}`);
        });

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
                `Schedule automation completed with prioritization. Scheduled ${scheduledAssignationCount} out of ${unscheduledAssignations.length} assignations.` :
                `Schedule automation completed. Scheduled ${scheduledAssignationCount} out of ${unscheduledAssignations.length} assignations.`,
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

        // Fetch global settings once to use for validations (e.g., operating hours, max hours, break durations)
        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(500).json({
                successful: false,
                message: "Settings could not be retrieved. Please try again later."
            });
        }

        for (const sched of schedule) {
            const { Day, Start_time, End_time, RoomId, AssignationId, Sections } = sched;
            console.log("Sections:", Sections);

            // Check required fields
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

            // Validate time format and order
            if (isValidTime(Start_time, End_time, res) !== true) return;

            // Calculate duration of the proposed schedule in hours
            const newStartSec = timeToSeconds(Start_time);
            const newEndSec = timeToSeconds(End_time);
            const currentScheduleDuration = (newEndSec - newStartSec) / 3600; // seconds to hours

            // Fetch and validate the room
            const room = await Room.findByPk(RoomId);
            if (!room) {
                return res.status(404).json({
                    successful: false,
                    message: `Room with ID ${RoomId} not found. Please provide a valid RoomId.`
                });
            }

            // Fetch the assignation with both Course and Professor information
            const assignation = await Assignation.findByPk(AssignationId, {
                include: [{ model: Course }, { model: Professor }]
            });
            if (!assignation || !assignation.Course || !assignation.Professor) {
                return res.status(404).json({
                    successful: false,
                    message: `Assignation with ID ${AssignationId} not found or missing course/professor details.`
                });
            }

            // Validate course duration balance for each section
            const courseTotalDuration = assignation.Course.Duration;
            const sectionsData = await ProgYrSec.findAll({
                where: { id: { [Op.in]: Sections } }
            });
            if (sectionsData.length !== Sections.length) {
                return res.status(404).json({
                    successful: false,
                    message: "One or more sections not found. Please provide valid section IDs."
                });
            }

            // Check for conflicting schedules in the same room on the same day
            const existingRoomSchedules = await Schedule.findAll({
                where: { Day, RoomId }
            });
            // Allow back-to-back schedules but check for any overlaps
            const isRoomConflict = existingRoomSchedules.some(existing => {
                const existingStartSec = timeToSeconds(existing.Start_time);
                const existingEndSec = timeToSeconds(existing.End_time);
                return (newStartSec < existingEndSec && newEndSec > existingStartSec);
            });
            if (isRoomConflict) {
                return res.status(400).json({
                    successful: false,
                    message: `Schedule conflict detected: Room ${RoomId} is already booked on ${Day} within ${Start_time} - ${End_time}.`
                });
            }

            // ****************** Additional Professor Validations ******************

            // Build the professor's schedule for the given day by fetching all schedules where the 
            // assignation's professor is teaching on that day.
            const professorSchedules = await Schedule.findAll({
                include: [{
                    model: Assignation,
                    where: { ProfessorId: assignation.Professor.id }
                }],
                where: { Day }
            });
            let profScheduleForDay = { hours: 0, dailyTimes: [] };
            professorSchedules.forEach(s => {
                const profSchedStart = parseInt(s.Start_time.split(":")[0]); // simple extraction; can be enhanced
                const profSchedEnd = parseInt(s.End_time.split(":")[0]);
                profScheduleForDay.hours += (profSchedEnd - profSchedStart);
                profScheduleForDay.dailyTimes.push({ start: profSchedStart, end: profSchedEnd });
            });
            const newStartHour = parseInt(Start_time.split(":")[0]);
            // Validate professor availability and workload using your helper
            if (!(await canScheduleProfessor(profScheduleForDay, newStartHour, currentScheduleDuration, settings, assignation.Professor.id, Day))) {
                return res.status(400).json({
                    successful: false,
                    message: `The professor ${assignation.Professor.Name} is not available at the specified time or would exceed the allowed teaching hours.`
                });
            }

            // ****************** Additional Student (Section) Validations ******************

            // For each section, build the day's schedule and check for both time conflicts and break requirements.
            for (const sectionId of Sections) {
                // Fetch all schedules associated with the section for the given day
                const sectionSchedules = await Schedule.findAll({
                    include: [{
                        model: ProgYrSec,
                        where: { id: sectionId }
                    }],
                    where: { Day }
                });
                let sectionScheduleForDay = { hours: 0, dailyTimes: [] };
                sectionSchedules.forEach(s => {
                    const sectionSchedStart = parseInt(s.Start_time.split(":")[0]);
                    const sectionSchedEnd = parseInt(s.End_time.split(":")[0]);
                    sectionScheduleForDay.hours += (sectionSchedEnd - sectionSchedStart);
                    sectionScheduleForDay.dailyTimes.push({ start: sectionSchedStart, end: sectionSchedEnd });
                });
                if (!canScheduleStudents(sectionScheduleForDay, newStartHour, currentScheduleDuration, settings)) {
                    return res.status(400).json({
                        successful: false,
                        message: `Section with ID ${sectionId} cannot be scheduled at the specified time, as it violates scheduling constraints (overlap or insufficient break between sessions).`
                    });
                }

                // Also, check that the additional schedule does not cause the total scheduled hours for the course
                // to exceed the total course duration.
                const existingSchedulesForSection = await Schedule.findAll({
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
                let scheduledHours = 0;
                existingSchedulesForSection.forEach(sched => {
                    const schedStart = timeToSeconds(sched.Start_time);
                    const schedEnd = timeToSeconds(sched.End_time);
                    scheduledHours += (schedEnd - schedStart) / 3600;
                });
                if (scheduledHours + currentScheduleDuration > courseTotalDuration) {
                    const remainingHours = courseTotalDuration - scheduledHours;
                    return res.status(400).json({
                        successful: false,
                        message: `For section with ID ${sectionId}, adding ${currentScheduleDuration} hours would exceed the course duration of ${courseTotalDuration} hours. Remaining balance: ${remainingHours} hours.`
                    });
                }
            }
            
            // ****************** All Validations Passed - Create Schedule ******************

            const newSchedule = await Schedule.create({
                Day,
                Start_time,
                End_time,
                RoomId,
                AssignationId
            });

            // Associate sections with the schedule
            await newSchedule.addProgYrSecs(Sections);

            // Optionally, re-fetch the newly created schedule with its associated sections
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
const updateSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Day, Start_time, RoomId, AssignationId, Sections } = req.body;

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
        const newStartSec = timeToSeconds(Start_time);
        const newEndSec = timeToSeconds(End_time);
        const updatedScheduleDuration = (newEndSec - newStartSec) / 3600; // Convert seconds to hours

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

        // Validate Assignation existence with course and professor info
        const assignation = await Assignation.findByPk(AssignationId, {
            include: [{ model: Course }, { model: Professor }]
        });
        if (!assignation || !assignation.Course || !assignation.Professor) {
            return res.status(404).json({
                successful: false,
                message: `Assignation with ID ${AssignationId} not found or missing course/professor details.`
            });
        }

        // Get course total duration from the assignation's course
        const courseTotalDuration = assignation.Course.Duration;

        // Validate all sections exist
        const sectionsData = await ProgYrSec.findAll({
            where: {
                id: { [Op.in]: Sections }
            }
        });
        if (sectionsData.length !== Sections.length) {
            return res.status(404).json({
                successful: false,
                message: "One or more sections not found. Please provide valid section IDs."
            });
        }

        // Check for conflicting schedules in the same room on the same day (excluding current schedule)
        const existingRoomSchedules = await Schedule.findAll({
            where: {
                Day,
                RoomId,
                id: { [Op.ne]: id } // Exclude current schedule
            }
        });

        // Conflict logic: allow back-to-back scheduling but no overlaps
        const isRoomConflict = existingRoomSchedules.some(existing => {
            const existingStart = timeToSeconds(existing.Start_time);
            const existingEnd = timeToSeconds(existing.End_time);
            return (newStartSec < existingEnd && newEndSec > existingStart);
        });
        if (isRoomConflict) {
            return res.status(400).json({
                successful: false,
                message: `Schedule conflict detected: Room ${RoomId} is already booked on ${Day} within ${Start_time} - ${End_time}.`
            });
        }

        // ******************** Additional Professor Availability Validations ********************

        // Build the professor's current schedule for the given day (excluding the current schedule being updated)
        const professorSchedules = await Schedule.findAll({
            include: [{
                model: Assignation,
                where: { ProfessorId: assignation.Professor.id }
            }],
            where: { Day, id: { [Op.ne]: id } }
        });
        let profScheduleForDay = { hours: 0, dailyTimes: [] };
        professorSchedules.forEach(s => {
            const startHour = parseInt(s.Start_time.split(":")[0]);
            const endHour = parseInt(s.End_time.split(":")[0]);
            profScheduleForDay.hours += (endHour - startHour);
            profScheduleForDay.dailyTimes.push({ start: startHour, end: endHour });
        });
        const newStartHour = parseInt(Start_time.split(":")[0]);

        // Validate professor availability and workload using helper function
        if (!(await canScheduleProfessor(profScheduleForDay, newStartHour, updatedScheduleDuration, settings, assignation.Professor.id, Day))) {
            return res.status(400).json({
                successful: false,
                message: `The professor ${assignation.Professor.Name} is not available at the specified time or would exceed the allowed teaching hours.`
            });
        }

        // ******************** Additional Student (Section) Availability Validations ********************

        // For each section, check their current schedule for the day (excluding current schedule)
        for (const sectionId of Sections) {
            const sectionSchedules = await Schedule.findAll({
                include: [{
                    model: ProgYrSec,
                    where: { id: sectionId }
                }],
                where: { Day, id: { [Op.ne]: id } }
            });
            let sectionScheduleForDay = { hours: 0, dailyTimes: [] };
            sectionSchedules.forEach(s => {
                const sectionStart = parseInt(s.Start_time.split(":")[0]);
                const sectionEnd = parseInt(s.End_time.split(":")[0]);
                sectionScheduleForDay.hours += (sectionEnd - sectionStart);
                sectionScheduleForDay.dailyTimes.push({ start: sectionStart, end: sectionEnd });
            });
            if (!canScheduleStudents(sectionScheduleForDay, newStartHour, updatedScheduleDuration, settings)) {
                return res.status(400).json({
                    successful: false,
                    message: `Section with ID ${sectionId} cannot be updated at the specified time, as it violates scheduling constraints (overlap or insufficient break between sessions).`
                });
            }

            // Check duration balance for each section with this course
            const existingSectionSchedules = await Schedule.findAll({
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
            let scheduledHours = 0;
            existingSectionSchedules.forEach(sched => {
                const schedStart = timeToSeconds(sched.Start_time);
                const schedEnd = timeToSeconds(sched.End_time);
                scheduledHours += (schedEnd - schedStart) / 3600;
            });
            if (scheduledHours + updatedScheduleDuration > courseTotalDuration) {
                const remainingHours = courseTotalDuration - scheduledHours;
                return res.status(400).json({
                    successful: false,
                    message: `For section with ID ${sectionId}, adding ${updatedScheduleDuration} hours would exceed the course duration of ${courseTotalDuration} hours. Remaining balance: ${remainingHours} hours.`
                });
            }
        }

        // ******************** Check for Time Conflicts Among Section Schedules ********************

        // Get all schedules for the sections, excluding the schedule we are updating
        const sectionSchedules = await Schedule.findAll({
            include: [{
                model: ProgYrSec,
                where: {
                    id: { [Op.in]: Sections }
                }
            }],
            where: { Day, id: { [Op.ne]: id } }
        });

        for (const section of Sections) {
            const conflictingSchedules = sectionSchedules.filter(sch => {
                const hasSection = sch.ProgYrSecs.some(s => s.id === section);
                if (!hasSection) return false;
                const existingStart = timeToSeconds(sch.Start_time);
                const existingEnd = timeToSeconds(sch.End_time);
                return (newStartSec < existingEnd && newEndSec > existingStart);
            });
            if (conflictingSchedules.length > 0) {
                return res.status(400).json({
                    successful: false,
                    message: `Schedule conflict detected: Section with ID ${section} already has a schedule on ${Day} within ${Start_time} - ${End_time}.`
                });
            }
        }

        // ******************** Update the Schedule and Associations ********************

        // Update schedule details
        await schedule.update({ Day, Start_time, End_time, RoomId, AssignationId });
        // Update section associations
        await schedule.setProgYrSecs(Sections);

        // Retrieve the updated schedule with associated sections
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

const toggleLock = async (req, res, next) => {
    try {
        const schedule = await Schedule.findByPk(req.params.id);
        if (!schedule) {
            return res.status(404).json({ successful: false, message: "Schedule not found." });
        }
        schedule.isLocked = !schedule.isLocked; // Toggle the lock status
        await schedule.save()

        return res.status(200).json({ successful: true, data: schedule });
    } catch (error) {
        return res.status(500).json({ successful: false, message: error.message || "An unexpected error; occurred." });
    }
};

module.exports = {
    addSchedule,
    automateSchedule,
    getSchedule,
    getAllSchedules,
    updateSchedule,
    deleteSchedule,
    getSchedsByRoom,
    getSchedsByProf,
    getSchedsByDept,
    toggleLock
};