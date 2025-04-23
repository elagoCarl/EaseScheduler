// Import required models and dependencies
const { Settings, Schedule, Room, Assignation, Program, Professor, ProgYrSec, Department, Course, ProfAvail } = require('../models');
const { Op } = require('sequelize');
const util = require("../../utils");
const { json } = require('body-parser');
const { lock } = require('../routers/profStatus_rtr');

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




const isSchedulePossible = async (
    roomSchedules,
    professorSchedule,
    progYrSecSchedules,
    roomId,
    professorId,
    sectionIds,
    day,
    startHour,
    duration,
    settings,
    priorities
) => {
    // (we no longer block non‐prioritized professors/sections here)

    // Room availability
    if (!isRoomAvailable(roomSchedules, roomId, day, startHour, duration)) {
        return false;
    }

    // Seat count
    const sections = await ProgYrSec.findAll({ where: { id: sectionIds } });
    const totalStudents = sections.reduce(
        (sum, sec) => sum + Number(sec.NumberOfStudents || 0),
        0
    );
    const room = await Room.findByPk(roomId);
    if (totalStudents > Number(room.NumberOfSeats || 0)) {
        return false;
    }

    // Professor availability & breaks
    if (!await canScheduleProfessor(
        professorSchedule[professorId][day],
        startHour, duration, settings, professorId, day
    )) {
        return false;
    }

    // Student conflicts & breaks
    for (const secId of sectionIds) {
        if (!canScheduleStudents(
            progYrSecSchedules[secId][day],
            startHour, duration, settings
        )) {
            return false;
        }
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


const generateScheduleVariants = async (req, res, next) => {
    try {
        const {
            DepartmentId,
            prioritizedProfessor,
            prioritizedRoom,
            prioritizedSections,
            roomId,
            variantCount = 2 // Default to 2 variants
        } = req.body;

        if (!DepartmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department ID is required."
            });
        }

        // Start measuring execution time
        const startTime = Date.now();

        // 1) Normalize priorities
        const priorities = {};
        if (prioritizedProfessor) {
            priorities.professor = Array.isArray(prioritizedProfessor)
                ? prioritizedProfessor
                : [prioritizedProfessor];
        }
        if (prioritizedRoom) {
            priorities.room = Array.isArray(prioritizedRoom)
                ? prioritizedRoom
                : [prioritizedRoom];
        }
        if (prioritizedSections && prioritizedSections.length) {
            priorities.sections = prioritizedSections;
        }
        // If we're forcing a specific room, drop any prioritizedRoom filter
        if (roomId) {
            delete priorities.room;
        }

        console.log(`→ Fetching settings for DepartmentId=${DepartmentId}`)
        // 2) Load settings
        const settings = await Settings.findOne({ where: { DepartmentId: DepartmentId } });
        if (!settings) {
            console.log(`⚠️  No settings found for DepartmentId=${DepartmentId}`);
        } else {
            console.log('✅  Loaded settings:', settings.get({ plain: true }));
            console.log(
                `Using settings for Dept ${settings.DepartmentId}:`,
                `StartHour=${settings.StartHour},`,
                `EndHour=${settings.EndHour},`,
                `StudentMaxHours=${settings.StudentMaxHours}`
            );
        }
        const { StartHour, EndHour } = settings;


        // 3) Fetch department + assignations + rooms - Optimize with eager loading
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
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }
        const assignations = department.Assignations;
        let rooms = department.DeptRooms;
        if (roomId) {
            rooms = rooms.filter(r => r.id === roomId);
            if (!rooms.length) {
                return res.status(404).json({
                    successful: false,
                    message: `Room with ID ${roomId} not found in department.`
                });
            }
        }

        // 4) Sort assignations by prioritizedProfessor (ordering only)
        if (priorities.professor) {
            assignations.sort((a, b) => {
                const aP = priorities.professor.includes(a.Professor?.id);
                const bP = priorities.professor.includes(b.Professor?.id);
                return (bP === aP) ? 0 : (bP ? 1 : -1);
            });
        }

        // 5) Get existing locked schedules for this department
        const assignationIds = assignations.map(a => a.id);
        const lockedSchedules = await Schedule.findAll({
            where: {
                AssignationId: { [Op.in]: assignationIds },
                isLocked: true
            },
            include: [{ model: ProgYrSec }, { model: Room }]
        });

        // 6) IMPORTANT CHANGE: Get ALL existing schedules for ANY room that might be used
        // This is to prevent double-booking across departments
        let roomIds = rooms.map(r => r.id);

        // Get ALL schedules for these rooms, regardless of department
        const allRoomSchedules = await Schedule.findAll({
            where: {
                RoomId: { [Op.in]: roomIds }
            },
            include: [{ model: Room }]
        });

        // Figure out which assignations remain locked
        const lockedAssignIds = new Set(
            lockedSchedules.map(s => s.AssignationId)
        );
        const unscheduledAssignations = assignations.filter(
            a => !lockedAssignIds.has(a.id)
        );

        // 7) Array to store our variants
        const scheduleVariants = [];

        // Create caches for better performance
        const roomCache = { sections: {} };
        const professorAvailabilityCache = {};
        const programCache = {};
        const courseProgCache = {};

        // Preload all sections once
        const allSecs = await ProgYrSec.findAll();
        for (const sec of allSecs) {
            // Cache section info
            roomCache.sections[sec.id] = {
                students: Number(sec.NumberOfStudents || 0),
                programId: sec.ProgramId,
                year: sec.Year,
                section: sec.Section
            };
        }

        // Preload department programs once
        const departmentPrograms = await Program.findAll({
            where: { DepartmentId: DepartmentId },
            attributes: ['id']
        });
        programCache[DepartmentId] = departmentPrograms.map(p => p.id);

        // Generate multiple schedule variants
        for (let variant = 0; variant < variantCount; variant++) {
            // 7a) Initialize tracking structures
            const professorSchedule = {}, courseSchedules = {}, progYrSecSchedules = {}, roomSchedules = {};

            // 7b) Initialize structures for this variant
            for (const a of assignations) {
                if (a.Professor) {
                    professorSchedule[a.Professor.id] = {};
                    for (let d = 1; d <= 6; d++) {
                        professorSchedule[a.Professor.id][d] = { hours: 0, dailyTimes: [] };
                    }
                }
                if (a.Course) {
                    courseSchedules[a.Course.id] = {};
                    for (let d = 1; d <= 6; d++) {
                        courseSchedules[a.Course.id][d] = [];
                    }
                }
            }

            // Initialize section schedules
            for (const sec of allSecs) {
                progYrSecSchedules[sec.id] = {};
                for (let d = 1; d <= 6; d++) {
                    progYrSecSchedules[sec.id][d] = { hours: 0, dailyTimes: [] };
                }
            }

            // 7c) CRUCIAL CHANGE: Initialize roomSchedules with ALL existing schedules from all departments
            // This ensures we don't double-book rooms across departments
            for (const sch of allRoomSchedules) {
                const day = sch.Day;
                const startH = parseInt(sch.Start_time.split(':')[0], 10);
                const endH = parseInt(sch.End_time.split(':')[0], 10);

                // Room schedules from ALL departments
                if (!roomSchedules[sch.RoomId]) roomSchedules[sch.RoomId] = {};
                if (!roomSchedules[sch.RoomId][day]) roomSchedules[sch.RoomId][day] = [];
                roomSchedules[sch.RoomId][day].push({ start: startH, end: endH });
            }

            // Now also add our department's locked schedules to the tracking structures
            for (const sch of lockedSchedules) {
                const assign = await Assignation.findByPk(sch.AssignationId, {
                    include: [Course, Professor]
                });
                if (!assign?.Professor || !assign?.Course) continue;

                const day = sch.Day;
                const startH = parseInt(sch.Start_time.split(':')[0], 10);
                const endH = parseInt(sch.End_time.split(':')[0], 10);
                const dur = endH - startH;

                // Professor
                professorSchedule[assign.Professor.id][day].hours += dur;
                professorSchedule[assign.Professor.id][day].dailyTimes.push({ start: startH, end: endH });

                // Course
                courseSchedules[assign.Course.id][day].push({ start: startH, end: endH });

                // Room schedules already added above (from allRoomSchedules)

                // Sections
                const linkedSecs = await sch.getProgYrSecs();
                for (const sec of linkedSecs) {
                    progYrSecSchedules[sec.id][day].hours += dur;
                    progYrSecSchedules[sec.id][day].dailyTimes.push({ start: startH, end: endH });
                }
            }

            // 8) For each variant, introduce different ordering
            // Clone unscheduled assignations for this variant and apply variant-specific ordering
            let variantAssignations = [...unscheduledAssignations];

            // Different ordering for different variants
            if (variant === 0) {
                // First variant: traditional ordering (same as automateSchedule)
                // Keep current ordering
            } else {
                // Subsequent variants: shuffle to create different patterns
                // Use deterministic shuffling based on variant number
                variantAssignations = shuffleDeterministic([...unscheduledAssignations], variant);
                rooms = shuffleDeterministic([...rooms], variant);
            }

            // 9) Run backtracking scheduler with this variant's configuration
            const report = [], failedAssignations = [];
            const variantSeed = variant + 1; // Use variant number as seed

            // This is a crucial change - run true backtracking like in automateSchedule
            await trueBacktrackScheduleVariant(
                variantAssignations,
                rooms,
                professorSchedule,
                courseSchedules,
                progYrSecSchedules,
                roomSchedules,
                0,
                report,
                StartHour,
                EndHour,
                settings,
                priorities,
                failedAssignations,
                roomId,
                variantSeed,
                roomCache,
                professorAvailabilityCache,
                programCache,
                courseProgCache
            );

            // 10) Store both locked schedules and newly generated ones for this variant
            const combinedReport = [
                ...lockedSchedules.map(sch => ({
                    id: sch.id,
                    Professor: sch.Assignation?.Professor?.Name,
                    Course: sch.Assignation?.Course?.Code,
                    CourseType: sch.Assignation?.Course?.Type,
                    Sections: sch.ProgYrSecs?.map(sec =>
                        `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`
                    ),
                    Room: sch.Room?.Code,
                    RoomId: sch.RoomId,
                    Day: sch.Day,
                    Start_time: sch.Start_time,
                    End_time: sch.End_time,
                    isLocked: true,
                    AssignationId: sch.AssignationId
                })),
                ...report
            ];

            scheduleVariants.push({
                variantName: `Variant ${variant + 1}`,
                schedules: combinedReport,
                failedAssignations: failedAssignations,
                successRate: `${report.length} of ${unscheduledAssignations.length} assignations scheduled`
            });
        }

        // 11) Form response with execution time
        const executionTime = Date.now() - startTime;
        return res.status(200).json({
            successful: true,
            message: `Generated ${scheduleVariants.length} schedule variants in ${executionTime}ms.`,
            variants: scheduleVariants
        });

    } catch (error) {
        console.error("Error in generateScheduleVariants:", error);
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// New true backtracking implementation for variants
// This closely follows the original backtrackSchedule logic but adapts it for variants
const trueBacktrackScheduleVariant = async (
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
    failedAssignations,
    roomId,
    seed,
    roomCache = {},
    professorAvailabilityCache = {},
    programCache = {},
    courseProgCache = {}
) => {
    // Base case: all assignations handled
    if (index === assignations.length) return true;

    const assignation = assignations[index];
    const { Course: courseParam, Professor: professorInfo } = assignation;
    const duration = courseParam.Duration;

    let validProgYrSecs = [];
    let assignationSuccessfullyScheduled = false;

    try {
        // --- 1) Determine valid sections for this assignation (by department & course type) ---
        const departmentId = assignation.DepartmentId;
        let validProgramIds;

        // Use cached program IDs if available
        if (programCache[departmentId]) {
            validProgramIds = programCache[departmentId];
        } else {
            const departmentPrograms = await Program.findAll({
                where: { DepartmentId: departmentId },
                attributes: ['id']
            });
            validProgramIds = departmentPrograms.map(p => p.id);
            programCache[departmentId] = validProgramIds;
        }

        if (courseParam.Type === "Core") {
            validProgYrSecs = await ProgYrSec.findAll({
                where: {
                    Year: courseParam.Year,
                    ProgramId: { [Op.in]: validProgramIds }
                }
            });
        } else if (courseParam.Type === "Professional") {
            // Use cached course programs if available
            const cacheKey = `course-${courseParam.id}`;
            let allowed;

            if (courseProgCache[cacheKey]) {
                allowed = courseProgCache[cacheKey].filter(id => validProgramIds.includes(id));
            } else {
                const courseWithPrograms = await Course.findOne({
                    where: { id: courseParam.id },
                    include: { model: Program, as: 'CourseProgs', attributes: ['id'] }
                });

                if (courseWithPrograms) {
                    allowed = courseWithPrograms.CourseProgs
                        .map(p => p.id)
                        .filter(id => validProgramIds.includes(id));
                    courseProgCache[cacheKey] = courseWithPrograms.CourseProgs.map(p => p.id);
                }
            }

            if (allowed && allowed.length) {
                validProgYrSecs = await ProgYrSec.findAll({
                    where: {
                        Year: courseParam.Year,
                        ProgramId: { [Op.in]: allowed }
                    }
                });
            }
        }

        // If none found, make a placeholder
        if (!validProgYrSecs.length) {
            const placeholderSection = {
                id: `placeholder-${assignation.id}`,
                ProgramId: validProgramIds[0] || 1,
                Year: courseParam.Year,
                Section: "No Section",
                toJSON() { return this; }
            };
            progYrSecSchedules[placeholderSection.id] = {};
            for (let d = 1; d <= 6; d++) {
                progYrSecSchedules[placeholderSection.id][d] = { hours: 0, dailyTimes: [] };
            }
            validProgYrSecs = [placeholderSection];
        }

        // If section-priorities exist, filter them
        if (priorities?.sections && !validProgYrSecs[0].id.toString().includes('placeholder')) {
            validProgYrSecs = validProgYrSecs.filter(sec =>
                priorities.sections.includes(sec.id)
            );
            if (!validProgYrSecs.length) {
                failedAssignations.push({
                    id: assignation.id,
                    Course: courseParam.Code,
                    Professor: professorInfo.Name,
                    reason: "No sections match the priority filter"
                });
                return trueBacktrackScheduleVariant(
                    assignations, rooms, professorSchedule, courseSchedules,
                    progYrSecSchedules, roomSchedules, index + 1,
                    report, startHour, endHour, settings, priorities,
                    failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
                    programCache, courseProgCache
                );
            }
        }

        // Group by Program-Year for chunk scheduling
        const sectionGroups = {};
        validProgYrSecs.forEach(sec => {
            const key = `${sec.ProgramId}-${sec.Year}`;
            sectionGroups[key] = sectionGroups[key] || [];
            sectionGroups[key].push(sec);
        });

        // --- 2) Build the candidate room list, enforcing RoomType === assignation.RoomType ---
        // build two lists: prioritized, then the rest
        const prioritizedList = priorities?.room
            ? rooms.filter(r => priorities.room.includes(r.id))
            : [];
        const fallbackList = priorities?.room
            ? rooms.filter(r => !priorities.room.includes(r.id))
            : rooms;

        // now interleave or concatenate:
        let roomsToTry = [
            ...prioritizedList,
            ...fallbackList
        ].filter(r => r.RoomTypeId === assignation.RoomTypeId);


        roomsToTry = roomsToTry.filter(r => r.RoomTypeId === assignation.RoomTypeId);
        if (!roomsToTry.length) {
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo.Name,
                reason: "No rooms of matching RoomType available"
            });
            return trueBacktrackScheduleVariant(
                assignations, rooms, professorSchedule, courseSchedules,
                progYrSecSchedules, roomSchedules, index + 1,
                report, startHour, endHour, settings, priorities,
                failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
                programCache, courseProgCache
            );
        }

        // --- 3) For variants, introduce different scheduling patterns ---
        // Variant-specific room ordering based on seed
        if (seed % 3 === 0) {
            // Sort rooms by capacity ascending
            roomsToTry.sort((a, b) => a.NumberOfSeats - b.NumberOfSeats);
        } else if (seed % 3 === 1) {
            // Sort rooms by capacity descending
            roomsToTry.sort((a, b) => b.NumberOfSeats - a.NumberOfSeats);
        } else {
            // Keep default order
        }

        // --- 4) Try scheduling each section-group on each day and room ---
        // Get different day orderings based on seed
        const allDays = [1, 2, 3, 4, 5, 6];
        let dayOrdering;

        if (seed % 2 === 0) {
            // Variant 1: Standard day ordering
            dayOrdering = [...allDays];
        } else {
            // Variant 2: Different day ordering
            dayOrdering = [3, 2, 4, 1, 5, 6]; // Try middle of week first
        }

        for (const group of Object.values(sectionGroups)) {
            // Order days by existing vs. empty load for each section group
            const [firstSec] = group;
            const daysWith = dayOrdering.filter(d => progYrSecSchedules[firstSec.id][d].hours > 0);
            const daysWithout = dayOrdering.filter(d => progYrSecSchedules[firstSec.id][d].hours === 0);

            // Order days differently based on variant
            let days;
            if (seed % 4 === 0) {
                days = daysWith.concat(daysWithout); // Prioritize days with existing schedules
            } else if (seed % 4 === 1) {
                days = daysWithout.concat(daysWith); // Prioritize empty days
            } else if (seed % 4 === 2) {
                days = dayOrdering.filter(d => d % 2 === 1).concat(dayOrdering.filter(d => d % 2 === 0)); // Odd days first
            } else {
                days = dayOrdering; // Default order
            }

            for (const day of days) {
                let scheduledHours = 0;
                for (const room of roomsToTry) {
                    // Get different hour orderings based on seed
                    let hourOptions = [];
                    for (let h = startHour; h + duration <= endHour; h++) {
                        hourOptions.push(h);
                    }

                    // Apply variant-specific hour ordering
                    if (seed % 3 === 1) {
                        // Reverse (descending order)
                        hourOptions.reverse();
                    } else if (seed % 3 === 2) {
                        // Start from middle of the day
                        const mid = Math.floor(hourOptions.length / 2);
                        hourOptions = [...hourOptions.slice(mid), ...hourOptions.slice(0, mid)];
                    }

                    for (let hour of hourOptions) {
                        if (scheduledHours >= settings.StudentMaxHours) break;

                        const sectionIds = group.map(s => s.id);
                        const isPlaceholder = sectionIds.some(id => typeof id === 'string' && id.includes('placeholder'));

                        if (await isSchedulePossible(
                            roomSchedules, professorSchedule, progYrSecSchedules,
                            room.id, professorInfo.id, sectionIds, day, hour,
                            duration, settings, priorities
                        )) {
                            // Create virtual schedule entry (don't save to database)
                            // Update trackers
                            professorSchedule[professorInfo.id][day].hours += duration;
                            professorSchedule[professorInfo.id][day].dailyTimes.push({ start: hour, end: hour + duration });
                            courseSchedules[courseParam.id][day].push({ start: hour, end: hour + duration });
                            roomSchedules[room.id] = roomSchedules[room.id] || {};
                            roomSchedules[room.id][day] = roomSchedules[room.id][day] || [];
                            roomSchedules[room.id][day].push({ start: hour, end: hour + duration });
                            group.forEach(sec => {
                                progYrSecSchedules[sec.id][day].hours += duration;
                                progYrSecSchedules[sec.id][day].dailyTimes.push({ start: hour, end: hour + duration });
                            });

                            report.push({
                                Professor: professorInfo.Name,
                                Course: courseParam.Code,
                                CourseType: courseParam.Type,
                                Sections: isPlaceholder ? ["No Section"] : group.map(s =>
                                    `ProgId=${s.ProgramId}, Year=${s.Year}, Sec=${s.Section}`
                                ),
                                Room: room.Code,
                                RoomId: room.id,
                                Day: day,
                                Start_time: `${hour}:00`,
                                End_time: `${hour + duration}:00`,
                                isLocked: false,
                                AssignationId: assignation.id
                            });

                            hour += duration;
                            scheduledHours += duration;
                            assignationSuccessfullyScheduled = true;

                            // For roomId specific runs, we don't need backtracking
                            if (roomId) {
                                return trueBacktrackScheduleVariant(
                                    assignations, rooms, professorSchedule, courseSchedules,
                                    progYrSecSchedules, roomSchedules, index + 1,
                                    report, startHour, endHour, settings, priorities,
                                    failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
                                    programCache, courseProgCache
                                );
                            }

                            // Try next level of backtracking
                            if (await trueBacktrackScheduleVariant(
                                assignations, rooms, professorSchedule, courseSchedules,
                                progYrSecSchedules, roomSchedules, index + 1,
                                report, startHour, endHour, settings, priorities,
                                failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
                                programCache, courseProgCache
                            )) {
                                return true;
                            }

                            // Backtrack by rolling back the changes
                            professorSchedule[professorInfo.id][day].hours -= duration;
                            professorSchedule[professorInfo.id][day].dailyTimes.pop();
                            courseSchedules[courseParam.id][day].pop();
                            roomSchedules[room.id][day].pop();
                            group.forEach(sec => {
                                progYrSecSchedules[sec.id][day].hours -= duration;
                                progYrSecSchedules[sec.id][day].dailyTimes.pop();
                            });
                            report.pop();
                            assignationSuccessfullyScheduled = false;
                        } // end if isSchedulePossible
                    } // end for hour
                } // end for room
            } // end for day
        } // end for group

        // If nothing fit, record failure
        if (!assignationSuccessfullyScheduled) {
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo.Name,
                reason: "No valid time slot found with given constraints"
            });
        }

        // Move on to next assignation
        return trueBacktrackScheduleVariant(
            assignations, rooms, professorSchedule, courseSchedules,
            progYrSecSchedules, roomSchedules, index + 1,
            report, startHour, endHour, settings, priorities,
            failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
            programCache, courseProgCache
        );

    } catch (err) {
        console.error("Error in trueBacktrackScheduleVariant:", err);
        failedAssignations.push({
            id: assignation.id,
            Course: courseParam.Code,
            Professor: professorInfo.Name,
            reason: `Error: ${err.message}`
        });
        return trueBacktrackScheduleVariant(
            assignations, rooms, professorSchedule, courseSchedules,
            progYrSecSchedules, roomSchedules, index + 1,
            report, startHour, endHour, settings, priorities,
            failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
            programCache, courseProgCache
        );
    }
};









// Endpoint to save a selected variant to the database
const saveScheduleVariant = async (req, res, next) => {
    try {
        const { variant, DepartmentId } = req.body;

        if (!variant || !variant.schedules || !DepartmentId) {
            return res.status(400).json({
                successful: false,
                message: "Invalid request: variant schedules and department ID are required."
            });
        }

        // 1. Get all existing schedules for this department that aren't locked
        const department = await Department.findByPk(DepartmentId, {
            include: [{ model: Assignation, attributes: ['id'] }]
        });

        if (!department) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const assignationIds = department.Assignations.map(a => a.id);

        // Delete all unlocked schedules
        await Schedule.destroy({
            where: {
                AssignationId: { [Op.in]: assignationIds },
                isLocked: false
            }
        });

        // 2. Create new schedules from the selected variant
        const newSchedules = [];

        for (const schedule of variant.schedules) {
            // Skip existing locked schedules (they'll have an ID)
            if (schedule.id && schedule.isLocked) {
                continue;
            }

            // Create new schedule
            const newSchedule = await Schedule.create({
                Day: schedule.Day,
                Start_time: schedule.Start_time,
                End_time: schedule.End_time,
                RoomId: schedule.RoomId,
                AssignationId: schedule.AssignationId,
                isLocked: false
            });

            // Add sections if they exist
            if (schedule.SectionIds && schedule.SectionIds.length > 0) {
                await newSchedule.setProgYrSecs(schedule.SectionIds);
            }

            newSchedules.push(newSchedule);
        }

        return res.status(200).json({
            successful: true,
            message: `Successfully saved schedule variant with ${newSchedules.length} new schedules.`,
            savedSchedules: newSchedules.length
        });

    } catch (error) {
        console.error("Error in saveScheduleVariant:", error);
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};








const automateSchedule = async (req, res, next) => {
    try {
        const {
            DepartmentId,
            prioritizedProfessor,
            prioritizedRoom,
            prioritizedSections,
            roomId,
            variants = 2
        } = req.body;

        if (!DepartmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department ID is required."
            });
        }

        // Start measuring execution time
        const startTime = Date.now();

        // 1) Normalize priorities
        const priorities = {};
        if (prioritizedProfessor) {
            priorities.professor = Array.isArray(prioritizedProfessor)
                ? prioritizedProfessor
                : [prioritizedProfessor];
        }
        if (prioritizedRoom) {
            priorities.room = Array.isArray(prioritizedRoom)
                ? prioritizedRoom
                : [prioritizedRoom];
        }
        if (prioritizedSections && prioritizedSections.length) {
            priorities.sections = prioritizedSections;
        }
        // If we're forcing a specific room, drop any prioritizedRoom filter
        if (roomId) {
            delete priorities.room;
        }

        // 2) Load settings
        const settings = await Settings.findOne({ where: { DepartmentId: DepartmentId } });
        const { StartHour, EndHour } = settings;

        // 3) Fetch department + assignations + rooms - Optimize with eager loading
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
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }
        const assignations = department.Assignations;
        let rooms = department.DeptRooms;
        if (roomId) {
            rooms = rooms.filter(r => r.id === roomId);
            if (!rooms.length) {
                return res.status(404).json({
                    successful: false,
                    message: `Room with ID ${roomId} not found in department.`
                });
            }
        }

        // 4) Sort assignations by prioritizedProfessor (ordering only)
        if (priorities.professor) {
            assignations.sort((a, b) => {
                const aP = priorities.professor.includes(a.Professor?.id);
                const bP = priorities.professor.includes(b.Professor?.id);
                return (bP === aP) ? 0 : (bP ? 1 : -1);
            });
        }

        // 5) Delete all unlocked schedules for this department first
        const assignationIds = assignations.map(a => a.id);

        // Define the where clause for deletion
        let whereClause = {
            AssignationId: { [Op.in]: assignationIds },
            isLocked: false
        };

        const schedulesToDelete = await Schedule.findAll({
            where: whereClause,
            include: [{ model: ProgYrSec }]
        });

        // For each schedule, remove associations before deleting
        for (const schedule of schedulesToDelete) {
            // Remove all associations with ProgYrSec
            await schedule.setProgYrSecs([]);
        }

        // Now delete the schedules
        const deletedCount = await Schedule.destroy({ where: whereClause });
        console.log(`Deleted ${deletedCount} unlocked schedules`);

        // Now fetch all remaining schedules (should only be locked ones)
        const existingSchedules = await Schedule.findAll({
            where: { AssignationId: { [Op.in]: assignationIds } }
        });

        // 6) Figure out which assignations remain locked
        const lockedAssignIds = new Set(
            existingSchedules.map(s => s.AssignationId)
        );
        const unscheduledAssignations = assignations.filter(
            a => !lockedAssignIds.has(a.id)
        );

        // 7) Initialize tracking structures with optimized data structures
        const professorSchedule = {}, courseSchedules = {}, progYrSecSchedules = {}, roomSchedules = {};

        // Use Map for caching to avoid repeated DB lookups
        const roomCache = { sections: {} };
        const professorAvailabilityCache = {};
        const programCache = {};
        const courseProgCache = {};

        for (const a of assignations) {
            if (a.Professor) {
                professorSchedule[a.Professor.id] = {};
                for (let d = 1; d <= 6; d++) {
                    professorSchedule[a.Professor.id][d] = { hours: 0, dailyTimes: [] };
                }
            }
            if (a.Course) {
                courseSchedules[a.Course.id] = {};
                for (let d = 1; d <= 6; d++) {
                    courseSchedules[a.Course.id][d] = [];
                }
            }
        }

        // Preload all sections at once
        const allSecs = await ProgYrSec.findAll();
        for (const sec of allSecs) {
            progYrSecSchedules[sec.id] = {};
            for (let d = 1; d <= 6; d++) {
                progYrSecSchedules[sec.id][d] = { hours: 0, dailyTimes: [] };
            }

            // Cache section info
            roomCache.sections[sec.id] = {
                students: Number(sec.NumberOfStudents || 0),
                programId: sec.ProgramId,
                year: sec.Year,
                section: sec.Section
            };
        }

        // 8) Seed in any *locked* schedules into those trackers in bulk
        // Group schedules by professor, course, room, and section for faster processing
        for (const sch of existingSchedules) {
            const assign = await Assignation.findByPk(sch.AssignationId, {
                include: [Course, Professor]
            });
            if (!assign?.Professor || !assign?.Course) continue;

            const day = sch.Day;
            const startH = parseInt(sch.Start_time.split(':')[0], 10);
            const endH = parseInt(sch.End_time.split(':')[0], 10);
            const dur = endH - startH;

            // Professor
            professorSchedule[assign.Professor.id][day].hours += dur;
            professorSchedule[assign.Professor.id][day].dailyTimes.push({ start: startH, end: endH });

            // Course
            courseSchedules[assign.Course.id][day].push({ start: startH, end: endH });

            // Room
            if (!roomSchedules[sch.RoomId]) roomSchedules[sch.RoomId] = {};
            if (!roomSchedules[sch.RoomId][day]) roomSchedules[sch.RoomId][day] = [];
            roomSchedules[sch.RoomId][day].push({ start: startH, end: endH });

            // Sections - Batch fetch sections for better performance
            const linkedSecs = await sch.getProgYrSecs();
            for (const sec of linkedSecs) {
                progYrSecSchedules[sec.id][day].hours += dur;
                progYrSecSchedules[sec.id][day].dailyTimes.push({ start: startH, end: endH });
            }
        }

        // Preload department programs
        const departmentPrograms = await Program.findAll({
            where: { DepartmentId: DepartmentId },
            attributes: ['id']
        });
        programCache[DepartmentId] = departmentPrograms.map(p => p.id);

        // 9) Run backtracking scheduler
        const report = [], failedAssignations = [];
        await backtrackSchedule(
            unscheduledAssignations,
            rooms,
            professorSchedule,
            courseSchedules,
            progYrSecSchedules,
            roomSchedules,
            0,
            report,
            StartHour,
            EndHour,
            settings,
            priorities,
            failedAssignations,
            roomId,
            roomCache,
            professorAvailabilityCache,
            programCache,
            courseProgCache
        );

        // 10) Build final schedule report for response
        const whereAll = { AssignationId: { [Op.in]: assignationIds } };
        if (roomId) whereAll.RoomId = roomId;
        const allSchedules = await Schedule.findAll({
            where: whereAll,
            include: [
                { model: Assignation, include: [Course, Professor] },
                { model: Room },
                { model: ProgYrSec }
            ]
        });
        const fullReport = allSchedules.map(sch => ({
            Professor: sch.Assignation.Professor.Name,
            Course: sch.Assignation.Course.Code,
            CourseType: sch.Assignation.Course.Type,
            Sections: sch.ProgYrSecs.map(sec =>
                `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`
            ),
            Room: sch.Room.Code,
            Day: sch.Day,
            Start_time: sch.Start_time,
            End_time: sch.End_time,
            isLocked: sch.isLocked
        }));

        // 11) Form response message with execution time
        const executionTime = Date.now() - startTime;
        let message;
        if (roomId) {
            message = `Schedule automation completed for ${rooms[0].Code} in ${executionTime}ms. Scheduled ${report.length} assignations.`;
        } else if (Object.keys(priorities).length) {
            message = `Schedule automation completed with prioritization in ${executionTime}ms. Scheduled ${report.length} out of ${unscheduledAssignations.length} assignations.`;
        } else {
            message = `Schedule automation completed in ${executionTime}ms. Scheduled ${report.length} out of ${unscheduledAssignations.length} assignations.`;
        }

        return res.status(200).json({
            successful: true,
            message,
            totalSchedules: fullReport.length,
            newSchedules: report.length,
            scheduleReport: report,
            fullScheduleReport: fullReport,
            failedAssignations,
            prioritiesApplied: Object.keys(priorities).length ? priorities : null,
            roomSpecific: Boolean(roomId)
        });

    } catch (error) {
        console.error("Error in automateSchedule:", error);
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Modify the backtrackSchedule function to filter valid sections by department
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
    failedAssignations,
    roomId
) => {
    // Base case: all assignations handled
    if (index === assignations.length) return true;

    const assignation = assignations[index];
    const { Course: courseParam, Professor: professorInfo } = assignation;
    const duration = courseParam.Duration;

    let validProgYrSecs = [];
    let assignationSuccessfullyScheduled = false;

    try {
        // --- 1) Determine valid sections for this assignation (by department & course type) ---
        const departmentId = assignation.DepartmentId;
        const departmentPrograms = await Program.findAll({
            where: { DepartmentId: departmentId },
            attributes: ['id']
        });
        const validProgramIds = departmentPrograms.map(p => p.id);

        if (courseParam.Type === "Core") {
            validProgYrSecs = await ProgYrSec.findAll({
                where: {
                    Year: courseParam.Year,
                    ProgramId: { [Op.in]: validProgramIds }
                }
            });
        } else if (courseParam.Type === "Professional") {
            const courseWithPrograms = await Course.findOne({
                where: { id: courseParam.id },
                include: { model: Program, as: 'CourseProgs', attributes: ['id'] }
            });
            if (courseWithPrograms) {
                const allowed = courseWithPrograms.CourseProgs
                    .map(p => p.id)
                    .filter(id => validProgramIds.includes(id));
                validProgYrSecs = await ProgYrSec.findAll({
                    where: {
                        Year: courseParam.Year,
                        ProgramId: { [Op.in]: allowed }
                    }
                });
            }
        }

        // If none found, make a placeholder
        if (!validProgYrSecs.length) {
            const placeholderSection = {
                id: `placeholder-${assignation.id}`,
                ProgramId: validProgramIds[0] || 1,
                Year: courseParam.Year,
                Section: "No Section",
                toJSON() { return this; }
            };
            progYrSecSchedules[placeholderSection.id] = {};
            for (let d = 1; d <= 6; d++) {
                progYrSecSchedules[placeholderSection.id][d] = { hours: 0, dailyTimes: [] };
            }
            validProgYrSecs = [placeholderSection];
        }

        // If section-priorities exist, filter them
        if (priorities?.sections && !validProgYrSecs[0].id.toString().includes('placeholder')) {
            validProgYrSecs = validProgYrSecs.filter(sec =>
                priorities.sections.includes(sec.id)
            );
            if (!validProgYrSecs.length) {
                failedAssignations.push({
                    id: assignation.id,
                    Course: courseParam.Code,
                    Professor: professorInfo.Name,
                    reason: "No sections match the priority filter"
                });
                return backtrackSchedule(
                    assignations, rooms, professorSchedule, courseSchedules,
                    progYrSecSchedules, roomSchedules, index + 1,
                    report, startHour, endHour, settings, priorities,
                    failedAssignations, roomId
                );
            }
        }

        // Group by Program-Year for chunk scheduling
        const sectionGroups = {};
        validProgYrSecs.forEach(sec => {
            const key = `${sec.ProgramId}-${sec.Year}`;
            sectionGroups[key] = sectionGroups[key] || [];
            sectionGroups[key].push(sec);
        });

        // --- 2) Build the candidate room list, enforcing RoomType === assignation.RoomType ---
        let roomsToTry = priorities?.room
            ? rooms.filter(r => priorities.room.includes(r.id))
            : rooms;

        roomsToTry = roomsToTry.filter(r => r.RoomTypeId === assignation.RoomTypeId);
        if (!roomsToTry.length) {
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo.Name,
                reason: "No rooms of matching RoomType available"
            });
            return backtrackSchedule(
                assignations, rooms, professorSchedule, courseSchedules,
                progYrSecSchedules, roomSchedules, index + 1,
                report, startHour, endHour, settings, priorities,
                failedAssignations, roomId
            );
        }

        // --- 3) Try scheduling each section-group on each day and room ---
        const allDays = [1, 2, 3, 4, 5, 6];
        for (const group of Object.values(sectionGroups)) {
            // order days by existing vs. empty load
            const [firstSec] = group;
            const daysWith = allDays.filter(d => progYrSecSchedules[firstSec.id][d].hours > 0);
            const daysWithout = allDays.filter(d => progYrSecSchedules[firstSec.id][d].hours === 0);
            const days = daysWith.concat(daysWithout);

            for (const day of days) {
                let scheduledHours = 0;
                for (const room of roomsToTry) {
                    let hour = startHour;

                    while (hour + duration <= endHour && scheduledHours < settings.StudentMaxHours) {
                        const sectionIds = group.map(s => s.id);
                        const isPlaceholder = sectionIds.some(id => typeof id === 'string' && id.includes('placeholder'));

                        if (await isSchedulePossible(
                            roomSchedules, professorSchedule, progYrSecSchedules,
                            room.id, professorInfo.id, sectionIds, day, hour,
                            duration, settings, priorities
                        )) {
                            // Persist schedule
                            const sch = await Schedule.create({
                                Day: day,
                                Start_time: `${hour}:00`,
                                End_time: `${hour + duration}:00`,
                                RoomId: room.id,
                                AssignationId: assignation.id,
                                isLocked: false
                            });
                            if (!isPlaceholder) await sch.addProgYrSecs(group);

                            // Update trackers
                            professorSchedule[professorInfo.id][day].hours += duration;
                            professorSchedule[professorInfo.id][day].dailyTimes.push({ start: hour, end: hour + duration });
                            courseSchedules[courseParam.id][day].push({ start: hour, end: hour + duration });
                            roomSchedules[room.id] = roomSchedules[room.id] || {};
                            roomSchedules[room.id][day] = roomSchedules[room.id][day] || [];
                            roomSchedules[room.id][day].push({ start: hour, end: hour + duration });
                            group.forEach(sec => {
                                progYrSecSchedules[sec.id][day].hours += duration;
                                progYrSecSchedules[sec.id][day].dailyTimes.push({ start: hour, end: hour + duration });
                            });

                            report.push({
                                Professor: professorInfo.Name,
                                Course: courseParam.Code,
                                CourseType: courseParam.Type,
                                Sections: isPlaceholder ? ["No Section"] : group.map(s =>
                                    `ProgId=${s.ProgramId}, Year=${s.Year}, Sec=${s.Section}`
                                ),
                                Room: room.Code,
                                Day: day,
                                Start_time: `${hour}:00`,
                                End_time: `${hour + duration}:00`
                            });

                            hour += duration;
                            scheduledHours += duration;
                            assignationSuccessfullyScheduled = true;

                            // If a single-room run, skip all backtracking
                            if (roomId) {
                                return backtrackSchedule(
                                    assignations, rooms, professorSchedule, courseSchedules,
                                    progYrSecSchedules, roomSchedules, index + 1,
                                    report, startHour, endHour, settings, priorities,
                                    failedAssignations, roomId
                                );
                            }

                            // Try next level
                            if (await backtrackSchedule(
                                assignations, rooms, professorSchedule, courseSchedules,
                                progYrSecSchedules, roomSchedules, index + 1,
                                report, startHour, endHour, settings, priorities,
                                failedAssignations, roomId
                            )) {
                                return true;
                            }

                            // Backtrack
                            await sch.destroy();
                            professorSchedule[professorInfo.id][day].hours -= duration;
                            professorSchedule[professorInfo.id][day].dailyTimes.pop();
                            courseSchedules[courseParam.id][day].pop();
                            roomSchedules[room.id][day].pop();
                            group.forEach(sec => {
                                progYrSecSchedules[sec.id][day].hours -= duration;
                                progYrSecSchedules[sec.id][day].dailyTimes.pop();
                            });
                            report.pop();
                            assignationSuccessfullyScheduled = false;
                        } else {
                            hour += duration;
                        }
                    } // end while
                    if (scheduledHours >= settings.StudentMaxHours) break;
                } // end for room
            } // end for day
        } // end for group

        // If nothing fit, record failure
        if (!assignationSuccessfullyScheduled) {
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo.Name,
                reason: "No valid time slot found with given constraints"
            });
        }

        // Move on to next assignation
        return backtrackSchedule(
            assignations, rooms, professorSchedule, courseSchedules,
            progYrSecSchedules, roomSchedules, index + 1,
            report, startHour, endHour, settings, priorities,
            failedAssignations, roomId
        );

    } catch (err) {
        console.error("Error in backtrackSchedule:", err);
        failedAssignations.push({
            id: assignation.id,
            Course: courseParam.Code,
            Professor: professorInfo.Name,
            reason: `Error: ${err.message}`
        });
        return backtrackSchedule(
            assignations, rooms, professorSchedule, courseSchedules,
            progYrSecSchedules, roomSchedules, index + 1,
            report, startHour, endHour, settings, priorities,
            failedAssignations, roomId
        );
    }
};


// Deterministic shuffle function for consistent variants
function shuffleDeterministic(array, seed) {
    const newArray = [...array];
    const pseudoRandom = (n) => {
        // Simple deterministic random function
        return (n * 9301 + 49297) % 233280 / 233280;
    };

    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(pseudoRandom(i + seed) * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}


// Helper function to shuffle array - introduces randomness for variants
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

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

// Updated controller function to toggle lock status (lock or unlock)
const toggleLockAllSchedules = async (req, res) => {
    try {
        const { scheduleIds, isLocked } = req.body;

        if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
            return res.status(400).json({
                successful: false,
                message: 'No schedule IDs provided'
            });
        }

        // Update all schedules to the specified lock status
        await Schedule.update(
            { isLocked: !!isLocked }, // Convert to boolean
            { where: { id: scheduleIds } }
        );

        return res.json({
            successful: true,
            message: `Successfully ${isLocked ? 'locked' : 'unlocked'} ${scheduleIds.length} schedules`
        });
    } catch (error) {
        console.error('Error toggling schedule lock status:', error);
        return res.status(500).json({
            successful: false,
            message: `An error occurred while ${isLocked ? 'locking' : 'unlocking'} schedules`
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
        const { Day, Start_time, End_time, RoomId, AssignationId, Sections } = req.body;

        // Validate mandatory fields
        if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId, Sections])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }
        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(500).json({
                successful: false,
                message: "Settings could not be retrieved. Please try again later."
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
        if (!canScheduleProfessor(profScheduleForDay, newStartHour, updatedScheduleDuration, settings, assignation.Professor.id, Day)) {
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

        // Check if schedule is locked
        if (schedule.isLocked) {
            return res.status(403).json({ successful: false, message: "Cannot delete locked schedule." });
        }

        await schedule.destroy();

        return res.status(200).json({ successful: true, message: "Schedule deleted successfully." });
    } catch (error) {
        next(error);
    }
};

const deleteAllDepartmentSchedules = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify department exists
        const department = await Department.findByPk(id);
        if (!department) {
            return res.status(404).json({ success: false, message: "Department not found" });
        }

        // Find all assignations for this department
        const departmentAssignations = await Assignation.findAll({
            where: { DepartmentId: id }
        });

        const assignationIds = departmentAssignations.map(assignation => assignation.id);

        if (assignationIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No schedules found for this department",
                deletedCount: 0
            });
        }

        // Delete all schedules that reference these assignations and are not locked
        const deletedSchedules = await Schedule.destroy({
            where: {
                AssignationId: {
                    [Op.in]: assignationIds
                },
                isLocked: false  // Only delete unlocked schedules
            }
        });

        res.status(200).json({
            success: true,
            message: `Successfully deleted ${deletedSchedules} schedules from the department`,
            deletedCount: deletedSchedules
        });

    } catch (error) {
        console.error("Error deleting department schedules:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete department schedules",
            error: error.message
        });
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
    toggleLock,
    toggleLockAllSchedules,
    deleteAllDepartmentSchedules,
    generateScheduleVariants,
    saveScheduleVariant

};

//LOCK ALL & DELETE ALL
//DISABLE CHANGES AND/OR BUTTONS WHILE AUTOMATION IS ON GOING