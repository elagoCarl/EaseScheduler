// Import required models and dependencies
const { Settings, Schedule, Room, Assignation, Program, Professor, ProgYrSec, Department, Course, ProfAvail, RoomType } = require('../models');
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


const canScheduleProfessor = async (profSchedule, startHour, duration, settings, professorId, day) => {
    const requiredBreak = settings.ProfessorBreak || 1; // Default break duration: 1 hour
    const maxContinuousHours = settings.maxAllowedGap || 5; // Max hours before break is required

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
        return duration <= maxContinuousHours; // Check if this single class exceeds max continuous hours
    }

    // Sort schedules by start time to find contiguous blocks and check break requirements
    const intervals = [...profSchedule.dailyTimes, { start: startHour, end: startHour + duration }]
        .sort((a, b) => a.start - b.start);

    // Track continuous teaching blocks
    for (let i = 0; i < intervals.length - 1; i++) {
        const current = intervals[i];
        const next = intervals[i + 1];
        
        // Check if this is the new proposed schedule adjacent to an existing one
        if (next.start === startHour || current.start === startHour) {
            // Case 1: This new class creates or extends a continuous block
            if (next.start === current.end) {
                // Classes are adjacent - check if combined duration exceeds max continuous hours
                const continuousDuration = next.end - current.start;
                if (continuousDuration > maxContinuousHours) {
                    return false; // Exceeds max continuous teaching hours
                }
            }
            // Case 2: Check if there's enough break between classes
            else if (next.start < current.end + requiredBreak && next.start > current.end) {
                return false; // Not enough break time
            }
            // Case 3: Check if this class itself exceeds max continuous hours
            else if (duration > maxContinuousHours) {
                return false;
            }
        }
    }

    // Check existing continuous blocks for violations
    let contiguousStart = intervals[0].start;
    let contiguousEnd = intervals[0].end;

    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i].start === contiguousEnd) {
            // This interval directly connects to the previous block
            contiguousEnd = intervals[i].end;
            
            // Check if this extension would exceed the maximum allowed continuous hours
            if (contiguousEnd - contiguousStart > maxContinuousHours) {
                return false;
            }
        } else {
            // There's a gap between intervals
            const gap = intervals[i].start - contiguousEnd;
            
            // If the previous block reached maximum allowed hours, check if there's enough break
            if (contiguousEnd - contiguousStart >= maxContinuousHours && gap < requiredBreak) {
                return false; // Not enough break after reaching max continuous hours
            }
            
            // Start a new contiguous block
            contiguousStart = intervals[i].start;
            contiguousEnd = intervals[i].end;
        }
    }

    return true;
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

        console.log("generateScheduleVariants received request:", {
            DepartmentId,
            prioritizedProfessor,
            prioritizedRoom,
            prioritizedSections,
            roomId,
            variantCount
        });

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

        // 4) Get existing locked schedules for this department
        const assignationIds = assignations.map(a => a.id);
        const lockedSchedules = await Schedule.findAll({
            where: {
                AssignationId: { [Op.in]: assignationIds },
                isLocked: true
            },
            include: [{ model: ProgYrSec }, { model: Room }]
        });

        console.log(`Found ${lockedSchedules.length} locked schedules`);

        // 5) IMPORTANT CHANGE: Get ALL existing schedules for ANY room that might be used
        // This is to prevent double-booking across departments
        let roomIds = rooms.map(r => r.id);

        // Get ALL schedules for these rooms, regardless of department
        const allRoomSchedules = await Schedule.findAll({
            where: {
                RoomId: { [Op.in]: roomIds }
            },
            include: [{ model: Room }]
        });

        console.log(`Found ${allRoomSchedules.length} schedules across all rooms`);

        // Figure out which assignations remain locked
        const lockedAssignIds = new Set(
            lockedSchedules.map(s => s.AssignationId)
        );
        let unscheduledAssignations = assignations.filter(
            a => !lockedAssignIds.has(a.id)
        );

        console.log(`Have ${unscheduledAssignations.length} unscheduled assignations to process`);

        // 6) IMPORTANT: Sort assignations by prioritizedProfessor (consistent across variants)
        if (priorities.professor) {
            unscheduledAssignations.sort((a, b) => {
                const aP = priorities.professor.includes(a.Professor?.id);
                const bP = priorities.professor.includes(b.Professor?.id);
                return (bP === aP) ? 0 : (aP ? -1 : 1); // Prioritized first (-1)
            });
        }

        // 7) Array to store our variants
        const scheduleVariants = [];

        // Create caches for better performance
        const roomCache = { sections: {} };
        const professorAvailabilityCache = {};
        const programCache = {};
        const courseProgCache = {};

        // Preload all sections once
        const allSecs = await ProgYrSec.findAll();
        console.log(`Loaded ${allSecs.length} total sections from database`);
        
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
            console.log(`\n====== Generating variant ${variant + 1} of ${variantCount} ======`);
            
            // 8a) Initialize tracking structures
            const professorSchedule = {}, courseSchedules = {}, progYrSecSchedules = {}, roomSchedules = {};

            // 8b) Initialize structures for this variant
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

            // 8c) CRUCIAL CHANGE: Initialize roomSchedules with ALL existing schedules from all departments
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
                console.log(`Schedule ${sch.id} has ${linkedSecs.length} linked sections`);
                
                for (const sec of linkedSecs) {
                    progYrSecSchedules[sec.id][day].hours += dur;
                    progYrSecSchedules[sec.id][day].dailyTimes.push({ start: startH, end: endH });
                }
            }

            // 9) CRITICAL FIX: For each variant, preserve priority ordering but apply variation to non-priority items
            // Clone unscheduled assignations for this variant
            let variantAssignations = [...unscheduledAssignations];
            
            // IMPORTANT: Split into prioritized and non-prioritized groups - only shuffle non-prioritized
            if (variant > 0) { // First variant keeps the original ordering
                if (priorities.professor) {
                    const prioritizedAssignations = variantAssignations.filter(a => 
                        priorities.professor.includes(a.Professor?.id));
                    const nonPrioritizedAssignations = variantAssignations.filter(a => 
                        !priorities.professor.includes(a.Professor?.id));
                    
                    // Only shuffle the non-prioritized assignations
                    const shuffledNonPriority = shuffleDeterministic([...nonPrioritizedAssignations], variant);
                    
                    // Recombine while preserving priority order
                    variantAssignations = [...prioritizedAssignations, ...shuffledNonPriority];
                } else {
                    // If no professor priorities, shuffle everything
                    variantAssignations = shuffleDeterministic([...unscheduledAssignations], variant);
                }
                
                // Handle room prioritization - split, shuffle non-priority, recombine
                let variantRooms = [...rooms];
                if (priorities.room) {
                    const prioritizedRooms = variantRooms.filter(r => 
                        priorities.room.includes(r.id));
                    const nonPrioritizedRooms = variantRooms.filter(r => 
                        !priorities.room.includes(r.id));
                    
                    // Only shuffle the non-prioritized rooms
                    const shuffledNonPriorityRooms = shuffleDeterministic([...nonPrioritizedRooms], variant);
                    
                    // Recombine while preserving priority order
                    variantRooms = [...prioritizedRooms, ...shuffledNonPriorityRooms];
                } else {
                    // If no room priorities, shuffle everything
                    variantRooms = shuffleDeterministic([...rooms], variant);
                }
                
                rooms = variantRooms;
            }

            // 10) Run backtracking scheduler with this variant's configuration
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

            console.log(`Variant ${variant + 1} results: ${report.length} scheduled, ${failedAssignations.length} failed`);

            // 11) Store both locked schedules and newly generated ones for this variant
            const combinedReport = [
                ...lockedSchedules.map(sch => {
                    // NEW LOGGING: Check and log the locked schedule sections
                    const sections = sch.ProgYrSecs?.map(sec =>
                        `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`
                    );
                    
                    console.log(`Locked schedule ${sch.id} sections:`, sections);
                    
                    // Extract section IDs for easier reference
                    const sectionIds = sch.ProgYrSecs?.map(sec => sec.id) || [];
                    
                    return {
                        id: sch.id,
                        Professor: sch.Assignation?.Professor?.Name,
                        Course: sch.Assignation?.Course?.Code,
                        CourseType: sch.Assignation?.Course?.Type,
                        // Include multiple section formats for compatibility
                        Sections: sections,
                        ProgYrSecIds: sectionIds, // Add explicit section IDs array
                        SectionIds: sectionIds.length > 0 ? sectionIds : undefined, // Alternative format
                        Room: sch.Room?.Code,
                        RoomId: sch.RoomId,
                        Day: sch.Day,
                        Start_time: sch.Start_time,
                        End_time: sch.End_time,
                        isLocked: true,
                        AssignationId: sch.AssignationId
                    };
                }),
                ...await Promise.all(report.map(async (schedule) => {
                    // NEW LOGGING: Log and ensure each report item has proper section IDs
                    console.log("Processing report schedule:", {
                        hasProgYrSecIds: Boolean(schedule.ProgYrSecIds),
                        hasSectionIds: Boolean(schedule.SectionIds),
                        sectionCount: schedule.Sections?.length
                    });
                    
                    // Make sure we have ProgYrSecIds for newly generated schedules
                    let sectionIds = [];
                    if (!schedule.ProgYrSecIds && Array.isArray(schedule.SectionIds)) {
                        schedule.ProgYrSecIds = schedule.SectionIds;
                        sectionIds = schedule.SectionIds;
                    }
                    else if (!schedule.ProgYrSecIds && Array.isArray(schedule.ProgYrSecs)) {
                        schedule.ProgYrSecIds = schedule.ProgYrSecs.map(s => s.id);
                        sectionIds = schedule.ProgYrSecIds;
                    }
                    else if (schedule.Sections && Array.isArray(schedule.Sections)) {
                        console.log("Processing Sections array:", schedule.Sections);
                        // First try the standard format ("ProgId=X, Year=Y, Sec=Z")
                        // [existing code...]
                        
                        // ADDED: If standard pattern fails, try parsing program-year-section format
                        // like "BSCS1A" which means program=BSCS, year=1, section=A
                        if (sectionIds.length === 0) {
                            const sectionPromises = schedule.Sections.map(async (sectionString) => {
                                // Match pattern like "BSCS1A" - program code followed by year number followed by section letter
                                const match = sectionString.match(/^([A-Z]+)(\d+)([A-Z])$/);
                                if (match) {
                                    const programCode = match[1]; // e.g., "BSCS"
                                    const year = parseInt(match[2], 10); // e.g., 1
                                    const section = match[3]; // e.g., "A"
                                    console.log("Parsed section from string:", { programCode, year, section });
                                    
                                    // Find the program ID by program code
                                    const program = await Program.findOne({ where: { Code: programCode } });
                                    if (!program) {
                                        console.log(`Program with code ${programCode} not found`);
                                        return null;
                                    }
                                    
                                    // Find the section in the database
                                    const sectionRecord = await ProgYrSec.findOne({ 
                                        where: { ProgramId: program.id, Year: year, Section: section } 
                                    });
                                    console.log("Section record found:", sectionRecord ? `ID: ${sectionRecord.id}` : "Not found");
                                    return sectionRecord ? sectionRecord.id : null;
                                }
                                return null;
                            });
                            
                            // Wait for all section queries to complete and filter out any nulls
                            const resolvedSectionIds = await Promise.all(sectionPromises);
                            sectionIds = resolvedSectionIds.filter(id => id !== null);
                            console.log("Final resolved section IDs from simplified format:", sectionIds);
                            
                            // Assign the resolved section IDs to the schedule
                            if (sectionIds.length > 0) {
                                schedule.ProgYrSecIds = sectionIds;
                            }
                        }
                    }
                    
                    return schedule;
                }))
            ];

            // NEW LOGGING: Final check on section IDs in the variant
            const sectionSummary = combinedReport.map((sch, index) => ({
                index,
                hasIds: Boolean(sch.ProgYrSecIds || sch.SectionIds),
                ProgYrSecIds: sch.ProgYrSecIds,
                SectionIds: sch.SectionIds 
            }));
            
            console.log(`Variant ${variant + 1} section ID summary:`, 
                JSON.stringify(sectionSummary, null, 2)
            );

            scheduleVariants.push({
                variantName: `Variant ${variant + 1}`,
                schedules: combinedReport,
                failedAssignations: failedAssignations,
                successRate: `${report.length} of ${unscheduledAssignations.length} assignations scheduled`
            });
        }

        // 12) Form response with execution time
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
                },
                include: [{
                    model: Program,
                    attributes: ['Code']
                }]
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
                        ProgramId: { [Op.in]: validProgramIds }
                    },
                    include: [{
                        model: Program,
                        attributes: ['Code']
                    }]
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
                                Sections: isPlaceholder ? ["No Section"] : group.map(s => {
                                    // Extract the program code based on ProgramId
                                    // This should be done with actual program data, so we're keeping the 
                                    // actual section information directly from the data
                                    return `${s.Program ? s.Program.Code : ""}${s.Year}${s.Section}`;
                                  }),
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

        // NEW LOGGING: Print the structure of the incoming variant
        console.log("Incoming variant structure:", JSON.stringify({
            scheduleCount: variant.schedules.length,
            sampleSchedule: variant.schedules[0],
            sectionFormats: variant.schedules.map(sch => ({
                hasProgYrSecIds: Boolean(sch.ProgYrSecIds),
                hasSectionIds: Boolean(sch.SectionIds),
                hasProgYrSecs: Boolean(sch.ProgYrSecs),
                hasStringSections: Boolean(sch.Sections),
                sectionsFormat: sch.Sections ? typeof sch.Sections : null
            }))
        }, null, 2));

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

            // NEW LOGGING: Print each schedule's section data
            console.log("Schedule section data:", {
                ProgYrSecIds: schedule.ProgYrSecIds,
                SectionIds: schedule.SectionIds,
                ProgYrSecs: schedule.ProgYrSecs,
                Sections: schedule.Sections
            });
            
            // Create new schedule
            const newSchedule = await Schedule.create({
                Day: schedule.Day,
                Start_time: schedule.Start_time,
                End_time: schedule.End_time,
                RoomId: schedule.RoomId,
                AssignationId: schedule.AssignationId,
                isLocked: false
            });

            // CRITICAL FIX: Look for section IDs in various formats
            let sectionIds = [];
            
            // Try to extract section IDs from the ProgYrSecIds property if it exists
            if (schedule.ProgYrSecIds && Array.isArray(schedule.ProgYrSecIds)) {
                sectionIds = schedule.ProgYrSecIds;
                console.log("Found section IDs in ProgYrSecIds:", sectionIds);
            }
            // Try to extract section IDs from SectionIds property if it exists
            else if (schedule.SectionIds && Array.isArray(schedule.SectionIds)) {
                sectionIds = schedule.SectionIds;
                console.log("Found section IDs in SectionIds:", sectionIds);
            }
            // If we have ProgYrSecs objects, extract their IDs
            else if (schedule.ProgYrSecs && Array.isArray(schedule.ProgYrSecs)) {
                sectionIds = schedule.ProgYrSecs.map(sec => sec.id);
                console.log("Found section IDs in ProgYrSecs objects:", sectionIds);
            }
            // If we need to parse section IDs from strings
            else if (schedule.Sections && Array.isArray(schedule.Sections)) {
                console.log("Processing Sections array:", schedule.Sections);
                // Try to find section IDs by querying the database based on the string format
                // Example format: "ProgId=1, Year=2, Sec=A"
                const sectionPromises = schedule.Sections.map(async (sectionString) => {
                    // Extract programId, year, and section from the string
                    const progIdMatch = sectionString.match(/ProgId=(\d+)/);
                    const yearMatch = sectionString.match(/Year=(\d+)/);
                    const secMatch = sectionString.match(/Sec=([A-Z])/);
                    
                    console.log("Parsing section string:", {
                        string: sectionString,
                        progIdMatch,
                        yearMatch,
                        secMatch
                    });
                    
                    if (progIdMatch && yearMatch && secMatch) {
                        const programId = parseInt(progIdMatch[1], 10);
                        const year = parseInt(yearMatch[1], 10);
                        const section = secMatch[1];
                        
                        console.log("Looking up section record for:", {
                            programId,
                            year,
                            section
                        });
                        
                        // Find the section in the database
                        const sectionRecord = await ProgYrSec.findOne({
                            where: {
                                ProgramId: programId,
                                Year: year,
                                Section: section
                            }
                        });
                        
                        console.log("Section record found:", sectionRecord ? 
                            `ID: ${sectionRecord.id}` : "Not found");
                        
                        return sectionRecord ? sectionRecord.id : null;
                    }
                    return null;
                });
                
                // Wait for all section queries to complete and filter out any nulls
                const resolvedSectionIds = await Promise.all(sectionPromises);
                sectionIds = resolvedSectionIds.filter(id => id !== null);
                console.log("Final resolved section IDs:", sectionIds);
            }

            // If we found any section IDs, associate them with the schedule
            if (sectionIds.length > 0) {
                console.log(`Setting ${sectionIds.length} section IDs for schedule:`, sectionIds);
                await newSchedule.setProgYrSecs(sectionIds);
            } else {
                console.log("No section IDs found to associate with schedule");
            }

            newSchedules.push(newSchedule);
        }
        
        // Final logging of section IDs per schedule
        console.log("Section IDs summary per schedule:", 
            variant.schedules.map(sch => ({
                hasIds: Boolean(sch.ProgYrSecIds || sch.SectionIds),
                ids: Array.isArray(sch.ProgYrSecIds) ? sch.ProgYrSecIds : 
                     Array.isArray(sch.SectionIds) ? sch.SectionIds : [],
                sections: sch.Sections
            }))
        );
        
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


// const automateSchedule = async (req, res, next) => {
//     try {
//         const {
//             DepartmentId,
//             prioritizedProfessor,
//             prioritizedRoom,
//             prioritizedSections,
//             roomId,
//             variants = 2
//         } = req.body;

//         if (!DepartmentId) {
//             return res.status(400).json({
//                 successful: false,
//                 message: "Department ID is required."
//             });
//         }

//         // Start measuring execution time
//         const startTime = Date.now();

//         // 1) Normalize priorities
//         const priorities = {};
//         if (prioritizedProfessor) {
//             priorities.professor = Array.isArray(prioritizedProfessor)
//                 ? prioritizedProfessor
//                 : [prioritizedProfessor];
//         }
//         if (prioritizedRoom) {
//             priorities.room = Array.isArray(prioritizedRoom)
//                 ? prioritizedRoom
//                 : [prioritizedRoom];
//         }
//         if (prioritizedSections && prioritizedSections.length) {
//             priorities.sections = prioritizedSections;
//         }
//         // If we're forcing a specific room, drop any prioritizedRoom filter
//         if (roomId) {
//             delete priorities.room;
//         }

//         // 2) Load settings
//         const settings = await Settings.findOne({ where: { DepartmentId: DepartmentId } });
//         const { StartHour, EndHour } = settings;

//         // 3) Fetch department + assignations + rooms - Optimize with eager loading
//         const department = await Department.findByPk(DepartmentId, {
//             include: [
//                 {
//                     model: Assignation,
//                     include: [
//                         Course,
//                         { model: Professor, attributes: ['id', 'Name'] }
//                     ]
//                 },
//                 { model: Room, as: 'DeptRooms' }
//             ]
//         });
//         if (!department) {
//             return res.status(404).json({
//                 successful: false,
//                 message: "Department not found."
//             });
//         }
//         const assignations = department.Assignations;
//         let rooms = department.DeptRooms;
//         if (roomId) {
//             rooms = rooms.filter(r => r.id === roomId);
//             if (!rooms.length) {
//                 return res.status(404).json({
//                     successful: false,
//                     message: `Room with ID ${roomId} not found in department.`
//                 });
//             }
//         }

//         // 4) Sort assignations by prioritizedProfessor (ordering only)
//         if (priorities.professor) {
//             assignations.sort((a, b) => {
//                 const aP = priorities.professor.includes(a.Professor?.id);
//                 const bP = priorities.professor.includes(b.Professor?.id);
//                 return (bP === aP) ? 0 : (bP ? 1 : -1);
//             });
//         }

//         // 5) Delete all unlocked schedules for this department first
//         const assignationIds = assignations.map(a => a.id);

//         // Define the where clause for deletion
//         let whereClause = {
//             AssignationId: { [Op.in]: assignationIds },
//             isLocked: false
//         };

//         const schedulesToDelete = await Schedule.findAll({
//             where: whereClause,
//             include: [{ model: ProgYrSec }]
//         });

//         // For each schedule, remove associations before deleting
//         for (const schedule of schedulesToDelete) {
//             // Remove all associations with ProgYrSec
//             await schedule.setProgYrSecs([]);
//         }

//         // Now delete the schedules
//         const deletedCount = await Schedule.destroy({ where: whereClause });
//         console.log(`Deleted ${deletedCount} unlocked schedules`);

//         // Now fetch all remaining schedules (should only be locked ones)
//         const existingSchedules = await Schedule.findAll({
//             where: { AssignationId: { [Op.in]: assignationIds } }
//         });

//         // 6) Figure out which assignations remain locked
//         const lockedAssignIds = new Set(
//             existingSchedules.map(s => s.AssignationId)
//         );
//         const unscheduledAssignations = assignations.filter(
//             a => !lockedAssignIds.has(a.id)
//         );

//         // 7) Initialize tracking structures with optimized data structures
//         const professorSchedule = {}, courseSchedules = {}, progYrSecSchedules = {}, roomSchedules = {};

//         // Use Map for caching to avoid repeated DB lookups
//         const roomCache = { sections: {} };
//         const professorAvailabilityCache = {};
//         const programCache = {};
//         const courseProgCache = {};

//         for (const a of assignations) {
//             if (a.Professor) {
//                 professorSchedule[a.Professor.id] = {};
//                 for (let d = 1; d <= 6; d++) {
//                     professorSchedule[a.Professor.id][d] = { hours: 0, dailyTimes: [] };
//                 }
//             }
//             if (a.Course) {
//                 courseSchedules[a.Course.id] = {};
//                 for (let d = 1; d <= 6; d++) {
//                     courseSchedules[a.Course.id][d] = [];
//                 }
//             }
//         }

//         // Preload all sections at once
//         const allSecs = await ProgYrSec.findAll();
//         for (const sec of allSecs) {
//             progYrSecSchedules[sec.id] = {};
//             for (let d = 1; d <= 6; d++) {
//                 progYrSecSchedules[sec.id][d] = { hours: 0, dailyTimes: [] };
//             }

//             // Cache section info
//             roomCache.sections[sec.id] = {
//                 students: Number(sec.NumberOfStudents || 0),
//                 programId: sec.ProgramId,
//                 year: sec.Year,
//                 section: sec.Section
//             };
//         }

//         // 8) Seed in any *locked* schedules into those trackers in bulk
//         // Group schedules by professor, course, room, and section for faster processing
//         for (const sch of existingSchedules) {
//             const assign = await Assignation.findByPk(sch.AssignationId, {
//                 include: [Course, Professor]
//             });
//             if (!assign?.Professor || !assign?.Course) continue;

//             const day = sch.Day;
//             const startH = parseInt(sch.Start_time.split(':')[0], 10);
//             const endH = parseInt(sch.End_time.split(':')[0], 10);
//             const dur = endH - startH;

//             // Professor
//             professorSchedule[assign.Professor.id][day].hours += dur;
//             professorSchedule[assign.Professor.id][day].dailyTimes.push({ start: startH, end: endH });

//             // Course
//             courseSchedules[assign.Course.id][day].push({ start: startH, end: endH });

//             // Room
//             if (!roomSchedules[sch.RoomId]) roomSchedules[sch.RoomId] = {};
//             if (!roomSchedules[sch.RoomId][day]) roomSchedules[sch.RoomId][day] = [];
//             roomSchedules[sch.RoomId][day].push({ start: startH, end: endH });

//             // Sections - Batch fetch sections for better performance
//             const linkedSecs = await sch.getProgYrSecs();
//             for (const sec of linkedSecs) {
//                 progYrSecSchedules[sec.id][day].hours += dur;
//                 progYrSecSchedules[sec.id][day].dailyTimes.push({ start: startH, end: endH });
//             }
//         }

//         // Preload department programs
//         const departmentPrograms = await Program.findAll({
//             where: { DepartmentId: DepartmentId },
//             attributes: ['id']
//         });
//         programCache[DepartmentId] = departmentPrograms.map(p => p.id);

//         // 9) Run backtracking scheduler
//         const report = [], failedAssignations = [];
//         await backtrackSchedule(
//             unscheduledAssignations,
//             rooms,
//             professorSchedule,
//             courseSchedules,
//             progYrSecSchedules,
//             roomSchedules,
//             0,
//             report,
//             StartHour,
//             EndHour,
//             settings,
//             priorities,
//             failedAssignations,
//             roomId,
//             roomCache,
//             professorAvailabilityCache,
//             programCache,
//             courseProgCache
//         );

//         // 10) Build final schedule report for response
//         const whereAll = { AssignationId: { [Op.in]: assignationIds } };
//         if (roomId) whereAll.RoomId = roomId;
//         const allSchedules = await Schedule.findAll({
//             where: whereAll,
//             include: [
//                 { model: Assignation, include: [Course, Professor] },
//                 { model: Room },
//                 { model: ProgYrSec }
//             ]
//         });
//         const fullReport = allSchedules.map(sch => ({
//             Professor: sch.Assignation.Professor.Name,
//             Course: sch.Assignation.Course.Code,
//             CourseType: sch.Assignation.Course.Type,
//             Sections: sch.ProgYrSecs.map(sec =>
//                 `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`
//             ),
//             Room: sch.Room.Code,
//             Day: sch.Day,
//             Start_time: sch.Start_time,
//             End_time: sch.End_time,
//             isLocked: sch.isLocked
//         }));

//         // 11) Form response message with execution time
//         const executionTime = Date.now() - startTime;
//         let message;
//         if (roomId) {
//             message = `Schedule automation completed for ${rooms[0].Code} in ${executionTime}ms. Scheduled ${report.length} assignations.`;
//         } else if (Object.keys(priorities).length) {
//             message = `Schedule automation completed with prioritization in ${executionTime}ms. Scheduled ${report.length} out of ${unscheduledAssignations.length} assignations.`;
//         } else {
//             message = `Schedule automation completed in ${executionTime}ms. Scheduled ${report.length} out of ${unscheduledAssignations.length} assignations.`;
//         }

//         return res.status(200).json({
//             successful: true,
//             message,
//             totalSchedules: fullReport.length,
//             newSchedules: report.length,
//             scheduleReport: report,
//             fullScheduleReport: fullReport,
//             failedAssignations,
//             prioritiesApplied: Object.keys(priorities).length ? priorities : null,
//             roomSpecific: Boolean(roomId)
//         });

//     } catch (error) {
//         console.error("Error in automateSchedule:", error);
//         return res.status(500).json({
//             successful: false,
//             message: error.message || "An unexpected error occurred."
//         });
//     }
// };

// // Modify the backtrackSchedule function to filter valid sections by department
// const backtrackSchedule = async (
//     assignations,
//     rooms,
//     professorSchedule,
//     courseSchedules,
//     progYrSecSchedules,
//     roomSchedules,
//     index,
//     report,
//     startHour,
//     endHour,
//     settings,
//     priorities,
//     failedAssignations,
//     roomId
// ) => {
//     // Base case: all assignations handled
//     if (index === assignations.length) return true;

//     const assignation = assignations[index];
//     const { Course: courseParam, Professor: professorInfo } = assignation;
//     const duration = courseParam.Duration;

//     let validProgYrSecs = [];
//     let assignationSuccessfullyScheduled = false;

//     try {
//         // --- 1) Determine valid sections for this assignation (by department & course type) ---
//         const departmentId = assignation.DepartmentId;
//         const departmentPrograms = await Program.findAll({
//             where: { DepartmentId: departmentId },
//             attributes: ['id']
//         });
//         const validProgramIds = departmentPrograms.map(p => p.id);

//         if (courseParam.Type === "Core") {
//             validProgYrSecs = await ProgYrSec.findAll({
//                 where: {
//                     Year: courseParam.Year,
//                     ProgramId: { [Op.in]: validProgramIds }
//                 }
//             });
//         } else if (courseParam.Type === "Professional") {
//             const courseWithPrograms = await Course.findOne({
//                 where: { id: courseParam.id },
//                 include: { model: Program, as: 'CourseProgs', attributes: ['id'] }
//             });
//             if (courseWithPrograms) {
//                 const allowed = courseWithPrograms.CourseProgs
//                     .map(p => p.id)
//                     .filter(id => validProgramIds.includes(id));
//                 validProgYrSecs = await ProgYrSec.findAll({
//                     where: {
//                         Year: courseParam.Year,
//                         ProgramId: { [Op.in]: allowed }
//                     }
//                 });
//             }
//         }

//         // If none found, make a placeholder
//         if (!validProgYrSecs.length) {
//             const placeholderSection = {
//                 id: `placeholder-${assignation.id}`,
//                 ProgramId: validProgramIds[0] || 1,
//                 Year: courseParam.Year,
//                 Section: "No Section",
//                 toJSON() { return this; }
//             };
//             progYrSecSchedules[placeholderSection.id] = {};
//             for (let d = 1; d <= 6; d++) {
//                 progYrSecSchedules[placeholderSection.id][d] = { hours: 0, dailyTimes: [] };
//             }
//             validProgYrSecs = [placeholderSection];
//         }

//         // If section-priorities exist, filter them
//         if (priorities?.sections && !validProgYrSecs[0].id.toString().includes('placeholder')) {
//             validProgYrSecs = validProgYrSecs.filter(sec =>
//                 priorities.sections.includes(sec.id)
//             );
//             if (!validProgYrSecs.length) {
//                 failedAssignations.push({
//                     id: assignation.id,
//                     Course: courseParam.Code,
//                     Professor: professorInfo.Name,
//                     reason: "No sections match the priority filter"
//                 });
//                 return backtrackSchedule(
//                     assignations, rooms, professorSchedule, courseSchedules,
//                     progYrSecSchedules, roomSchedules, index + 1,
//                     report, startHour, endHour, settings, priorities,
//                     failedAssignations, roomId
//                 );
//             }
//         }

//         // Group by Program-Year for chunk scheduling
//         const sectionGroups = {};
//         validProgYrSecs.forEach(sec => {
//             const key = `${sec.ProgramId}-${sec.Year}`;
//             sectionGroups[key] = sectionGroups[key] || [];
//             sectionGroups[key].push(sec);
//         });

//         // --- 2) Build the candidate room list, enforcing RoomType === assignation.RoomType ---
//         let roomsToTry = priorities?.room
//             ? rooms.filter(r => priorities.room.includes(r.id))
//             : rooms;

//         roomsToTry = roomsToTry.filter(r => r.RoomTypeId === assignation.RoomTypeId);
//         if (!roomsToTry.length) {
//             failedAssignations.push({
//                 id: assignation.id,
//                 Course: courseParam.Code,
//                 Professor: professorInfo.Name,
//                 reason: "No rooms of matching RoomType available"
//             });
//             return backtrackSchedule(
//                 assignations, rooms, professorSchedule, courseSchedules,
//                 progYrSecSchedules, roomSchedules, index + 1,
//                 report, startHour, endHour, settings, priorities,
//                 failedAssignations, roomId
//             );
//         }

//         // --- 3) Try scheduling each section-group on each day and room ---
//         const allDays = [1, 2, 3, 4, 5, 6];
//         for (const group of Object.values(sectionGroups)) {
//             // order days by existing vs. empty load
//             const [firstSec] = group;
//             const daysWith = allDays.filter(d => progYrSecSchedules[firstSec.id][d].hours > 0);
//             const daysWithout = allDays.filter(d => progYrSecSchedules[firstSec.id][d].hours === 0);
//             const days = daysWith.concat(daysWithout);

//             for (const day of days) {
//                 let scheduledHours = 0;
//                 for (const room of roomsToTry) {
//                     let hour = startHour;

//                     while (hour + duration <= endHour && scheduledHours < settings.StudentMaxHours) {
//                         const sectionIds = group.map(s => s.id);
//                         const isPlaceholder = sectionIds.some(id => typeof id === 'string' && id.includes('placeholder'));

//                         if (await isSchedulePossible(
//                             roomSchedules, professorSchedule, progYrSecSchedules,
//                             room.id, professorInfo.id, sectionIds, day, hour,
//                             duration, settings, priorities
//                         )) {
//                             // Persist schedule
//                             const sch = await Schedule.create({
//                                 Day: day,
//                                 Start_time: `${hour}:00`,
//                                 End_time: `${hour + duration}:00`,
//                                 RoomId: room.id,
//                                 AssignationId: assignation.id,
//                                 isLocked: false
//                             });
//                             if (!isPlaceholder) await sch.addProgYrSecs(group);

//                             // Update trackers
//                             professorSchedule[professorInfo.id][day].hours += duration;
//                             professorSchedule[professorInfo.id][day].dailyTimes.push({ start: hour, end: hour + duration });
//                             courseSchedules[courseParam.id][day].push({ start: hour, end: hour + duration });
//                             roomSchedules[room.id] = roomSchedules[room.id] || {};
//                             roomSchedules[room.id][day] = roomSchedules[room.id][day] || [];
//                             roomSchedules[room.id][day].push({ start: hour, end: hour + duration });
//                             group.forEach(sec => {
//                                 progYrSecSchedules[sec.id][day].hours += duration;
//                                 progYrSecSchedules[sec.id][day].dailyTimes.push({ start: hour, end: hour + duration });
//                             });

//                             report.push({
//                                 Professor: professorInfo.Name,
//                                 Course: courseParam.Code,
//                                 CourseType: courseParam.Type,
//                                 Sections: isPlaceholder ? ["No Section"] : group.map(s =>
//                                     `ProgId=${s.ProgramId}, Year=${s.Year}, Sec=${s.Section}`
//                                 ),
//                                 Room: room.Code,
//                                 Day: day,
//                                 Start_time: `${hour}:00`,
//                                 End_time: `${hour + duration}:00`
//                             });

//                             hour += duration;
//                             scheduledHours += duration;
//                             assignationSuccessfullyScheduled = true;

//                             // If a single-room run, skip all backtracking
//                             if (roomId) {
//                                 return backtrackSchedule(
//                                     assignations, rooms, professorSchedule, courseSchedules,
//                                     progYrSecSchedules, roomSchedules, index + 1,
//                                     report, startHour, endHour, settings, priorities,
//                                     failedAssignations, roomId
//                                 );
//                             }

//                             // Try next level
//                             if (await backtrackSchedule(
//                                 assignations, rooms, professorSchedule, courseSchedules,
//                                 progYrSecSchedules, roomSchedules, index + 1,
//                                 report, startHour, endHour, settings, priorities,
//                                 failedAssignations, roomId
//                             )) {
//                                 return true;
//                             }

//                             // Backtrack
//                             await sch.destroy();
//                             professorSchedule[professorInfo.id][day].hours -= duration;
//                             professorSchedule[professorInfo.id][day].dailyTimes.pop();
//                             courseSchedules[courseParam.id][day].pop();
//                             roomSchedules[room.id][day].pop();
//                             group.forEach(sec => {
//                                 progYrSecSchedules[sec.id][day].hours -= duration;
//                                 progYrSecSchedules[sec.id][day].dailyTimes.pop();
//                             });
//                             report.pop();
//                             assignationSuccessfullyScheduled = false;
//                         } else {
//                             hour += duration;
//                         }
//                     } // end while
//                     if (scheduledHours >= settings.StudentMaxHours) break;
//                 } // end for room
//             } // end for day
//         } // end for group

//         // If nothing fit, record failure
//         if (!assignationSuccessfullyScheduled) {
//             failedAssignations.push({
//                 id: assignation.id,
//                 Course: courseParam.Code,
//                 Professor: professorInfo.Name,
//                 reason: "No valid time slot found with given constraints"
//             });
//         }

//         // Move on to next assignation
//         return backtrackSchedule(
//             assignations, rooms, professorSchedule, courseSchedules,
//             progYrSecSchedules, roomSchedules, index + 1,
//             report, startHour, endHour, settings, priorities,
//             failedAssignations, roomId
//         );

//     } catch (err) {
//         console.error("Error in backtrackSchedule:", err);
//         failedAssignations.push({
//             id: assignation.id,
//             Course: courseParam.Code,
//             Professor: professorInfo.Name,
//             reason: `Error: ${err.message}`
//         });
//         return backtrackSchedule(
//             assignations, rooms, professorSchedule, courseSchedules,
//             progYrSecSchedules, roomSchedules, index + 1,
//             report, startHour, endHour, settings, priorities,
//             failedAssignations, roomId
//         );
//     }
// };

// Helper function to shuffle array - introduces randomness for variants
// function shuffle(array) {
//     for (let i = array.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [array[i], array[j]] = [array[j], array[i]];
//     }
//     return array;
// }

// const toggleLock = async (req, res, next) => {
//     try {
//         const schedule = await Schedule.findByPk(req.params.id);
//         if (!schedule) {
//             return res.status(404).json({ successful: false, message: "Schedule not found." });
//         }
//         schedule.isLocked = !schedule.isLocked; // Toggle the lock status
//         await schedule.save()

//         return res.status(200).json({ successful: true, data: schedule });
//     } catch (error) {
//         return res.status(500).json({ successful: false, message: error.message || "An unexpected error; occurred." });
//     }
// };

// Updated controller function to toggle lock status (lock or unlock)

const toggleLock = async (req, res, next) => {
    try {
        const { DepartmentId } = req.body
        const schedule = await Schedule.findByPk(req.params.id);
        if (!schedule) {
            return res.status(404).json({ successful: false, message: "Schedule not found." });
        }

        const assignation = await Assignation.findByPk(schedule.AssignationId);
        if (!assignation) {
            return res.status(404).json({ successful: false, message: "Assignation not found." });
        }

        // Check if the schedule belongs to the specified department
        if (assignation.DepartmentId !== DepartmentId) {
            return res.status(403).json({ successful: false, message: "Schedule does not belong to the specified department." });
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
        const { scheduleIds, isLocked, DepartmentId } = req.body;

        if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
            return res.status(400).json({
                successful: false,
                message: 'No schedule IDs provided'
            });
        }

        //find schedules that have assignations with the specified DepartmentId
        const eligibleSchedules = await Schedule.findAll({
            where: {
                id: scheduleIds
            },
            include: [{
                model: Assignation,
                where: { DepartmentId: DepartmentId },
                required: true
            }]
        });

        const eligibleScheduleIds = eligibleSchedules.map(schedule => schedule.id);

        if (eligibleScheduleIds.length === 0) {
            return res.status(404).json({
                successful: false,
                message: 'All eligible schedules are already locked or No schedules found for the specified department'
            });
        }

        await Schedule.update(
            { isLocked: !!isLocked },
            { where: { id: eligibleScheduleIds } }
        );

        return res.json({
            successful: true,
            message: `Successfully ${isLocked ? 'locked' : 'unlocked'} ${eligibleScheduleIds.length} schedules`
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
            const { Day, Start_time, End_time, RoomId, AssignationId, Sections, Semester } = sched;
            console.log("Sections:", Sections);

            // Check required fields - now including Semester
            if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId, Sections, Semester])) {
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

            // Validate the semester matches the assignation's semester
            if (assignation.Semester !== Semester) {
                return res.status(400).json({
                    successful: false,
                    message: `Semester mismatch: Schedule is for ${Semester} but Assignation is for ${assignation.Semester}.`
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
            let totalStudents = 0;
            for (const section of sectionsData) {
                totalStudents += section.NumberOfStudents;
            }

            if (totalStudents > room.NumberOfSeats) {
                return res.status(400).json({
                    successful: false,
                    message: `Room capacity exceeded: ${room.Code} has ${room.NumberOfSeats} seats but the scheduled sections have ${totalStudents} students in total.`
                });
            }
            
            // Check for conflicting schedules in the same room on the same day - now filtered by semester
            const existingRoomSchedules = await Schedule.findAll({
                include: [{
                    model: Assignation,
                    where: { Semester }
                }],
                where: { Day, RoomId }
            });
            
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            const currentDay = days[Day - 1]
            
            // Allow back-to-back schedules but check for any overlaps
            const isRoomConflict = existingRoomSchedules.some(existing => {
                const existingStartSec = timeToSeconds(existing.Start_time);
                const existingEndSec = timeToSeconds(existing.End_time);
                return (newStartSec < existingEndSec && newEndSec > existingStartSec);
            });
            
            if (isRoomConflict) {
                return res.status(400).json({
                    successful: false,
                    message: `Schedule conflict detected: Room ${room.Code} is already booked on ${currentDay} within ${Start_time} - ${End_time} for ${Semester} semester.`
                });
            }

            // ****************** Additional Professor Validations ******************

            // Check if the professor is available during the scheduled time
            const professorId = assignation.Professor.id;
            const professorAvailabilities = await ProfAvail.findAll({
                where: {
                    ProfessorId: professorId,
                    Day: currentDay // Ensure Day formats match between Schedule and ProfAvail
                }
            });

            // If professor has no availabilities set for this day, they're not available
            if (professorAvailabilities.length === 0) {
                return res.status(400).json({
                    successful: false,
                    message: `Professor ${assignation.Professor.Name} has no availability set for ${currentDay}.`
                });
            }

            // Check if the proposed schedule falls within any of the professor's available time slots
            const isProfessorAvailable = professorAvailabilities.some(availability => {
                const availStartSec = timeToSeconds(availability.Start_time);
                const availEndSec = timeToSeconds(availability.End_time);

                // The proposed schedule must be fully contained within an availability slot
                return (newStartSec >= availStartSec && newEndSec <= availEndSec);
            });

            if (!isProfessorAvailable) {
                return res.status(400).json({
                    successful: false,
                    message: `Professor ${assignation.Professor.Name} is not available during ${Start_time} - ${End_time} on ${currentDay}.`
                });
            }

            // Build the professor's schedule for the given day by fetching all schedules where the 
            // assignation's professor is teaching on that day - now filtered by semester
            const professorSchedules = await Schedule.findAll({
                include: [{
                    model: Assignation,
                    where: { 
                        ProfessorId: assignation.Professor.id,
                        Semester
                    }
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

            // Check for schedule conflicts with professor's existing schedules
            const isProfessorScheduleConflict = professorSchedules.some(existing => {
                const existingStartSec = timeToSeconds(existing.Start_time);
                const existingEndSec = timeToSeconds(existing.End_time);
                return (newStartSec < existingEndSec && newEndSec > existingStartSec);
            });

            if (isProfessorScheduleConflict) {
                return res.status(400).json({
                    successful: false,
                    message: `Professor ${assignation.Professor.Name} has a scheduling conflict during ${Start_time} - ${End_time} on day ${currentDay} for ${Semester} semester.`
                });
            }

            // Validate professor workload using your helper
            if (!(await canScheduleProfessor(profScheduleForDay, newStartHour, currentScheduleDuration, settings, assignation.Professor.id, Day))) {
                return res.status(400).json({
                    successful: false,
                    message: `The professor ${assignation.Professor.Name} would exceed the allowed teaching hours for ${Semester} semester.`
                });
            }

            // ****************** Additional Student (Section) Validations ******************

            // For each section, build the day's schedule and check for both time conflicts and break requirements.
            for (const sectionId of Sections) {
                // Fetch all schedules associated with the section for the given day - now filtered by semester
                const sectionSchedules = await Schedule.findAll({
                    include: [
                        {
                            model: ProgYrSec,
                            where: { id: sectionId }
                        },
                        {
                            model: Assignation,
                            where: { Semester }
                        }
                    ],
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
                        message: `Section with ID ${sectionId} cannot be scheduled at the specified time in ${Semester} semester, as it violates scheduling constraints (overlap or insufficient break between sessions).`
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
                            where: { 
                                CourseId: assignation.Course.id,
                                Semester
                            }
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
                        message: `For section with ID ${sectionId} in ${Semester} semester, adding ${currentScheduleDuration} hours would exceed the course duration of ${courseTotalDuration} hours. Remaining balance: ${remainingHours} hours.`
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
                // Note: Semester is part of the Assignation model, not directly in Schedule
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
        const { Day, Start_time, End_time, RoomId, AssignationId, Sections, Semester } = req.body;
        console.log(Semester);
        

        // Validate mandatory fields - now including Semester
        if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId, Sections, Semester])) {
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

        // Validate the semester matches the assignation's semester
        if (assignation.Semester !== Semester) {
            return res.status(400).json({
                successful: false,
                message: `Semester mismatch: Schedule is for ${Semester} but Assignation is for ${assignation.Semester}.`
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
        let totalStudents = 0;
        for (const section of sectionsData) {
            totalStudents += section.NumberOfStudents;
        }
        if (totalStudents > room.NumberOfSeats) {
            return res.status(400).json({
              successful: false,
              message: `Room capacity exceeded: ${room.Code} has ${room.NumberOfSeats} seats but the scheduled sections have ${totalStudents} students in total.`
            });
        }

        // Check for conflicting schedules in the same room on the same day (excluding current schedule)
        // Now filtered by semester
        const existingRoomSchedules = await Schedule.findAll({
            include: [{
                model: Assignation,
                where: { Semester }
            }],
            where: {
                Day,
                RoomId,
                id: { [Op.ne]: id } // Exclude current schedule
            }
        });

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const currentDay = days[Day - 1]
        // Conflict logic: allow back-to-back scheduling but no overlaps
        const isRoomConflict = existingRoomSchedules.some(existing => {
            const existingStart = timeToSeconds(existing.Start_time);
            const existingEnd = timeToSeconds(existing.End_time);
            return (newStartSec < existingEnd && newEndSec > existingStart);
        });
        if (isRoomConflict) {
            return res.status(400).json({
                successful: false,
                message: `Schedule conflict detected: Room ${room.Code} is already booked on ${currentDay} within ${Start_time} - ${End_time} for ${Semester} semester.`
            });
        }

        // ******************** Additional Professor Availability Validations ********************

        // Build the professor's current schedule for the given day (excluding the current schedule being updated)
        // Now filtered by semester
        const professorSchedules = await Schedule.findAll({
            include: [{
                model: Assignation,
                where: { 
                    ProfessorId: assignation.Professor.id,
                    Semester
                }
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
        // Check if the professor is available during the scheduled time
        const professorId = assignation.Professor.id;
        console.log(Day);
        
        const professorAvailabilities = await ProfAvail.findAll({
            where: {
                ProfessorId: professorId,
                Day: currentDay
            }
        });

        // If professor has no availabilities set for this day, they're not available
        if (professorAvailabilities.length === 0) {
            return res.status(400).json({
                successful: false,
                message: `Professor ${assignation.Professor.Name} has no availability set for day ${currentDay}.`
            });
        }

        // Check if the proposed schedule falls within any of the professor's available time slots
        const isProfessorAvailable = professorAvailabilities.some(availability => {
            const availStartSec = timeToSeconds(availability.Start_time);
            const availEndSec = timeToSeconds(availability.End_time);

            // The proposed schedule must be fully contained within an availability slot
            return (newStartSec >= availStartSec && newEndSec <= availEndSec);
        });

        if (!isProfessorAvailable) {
            return res.status(400).json({
                successful: false,
                message: `Professor ${assignation.Professor.Name} is not available during ${Start_time} - ${End_time} on day ${currentDay}.`
            });
        }

        // Check for schedule conflicts with professor's existing schedules
        const isProfessorScheduleConflict = professorSchedules.some(existing => {
            const existingStartSec = timeToSeconds(existing.Start_time);
            const existingEndSec = timeToSeconds(existing.End_time);
            return (newStartSec < existingEndSec && newEndSec > existingStartSec);
        });

        if (isProfessorScheduleConflict) {
            return res.status(400).json({
                successful: false,
                message: `Professor ${assignation.Professor.Name} has a scheduling conflict during ${Start_time} - ${End_time} on day ${currentDay} for ${Semester} semester.`
            });
        }

        // Validate professor availability and workload using helper function
        if (!canScheduleProfessor(profScheduleForDay, newStartHour, updatedScheduleDuration, settings, assignation.Professor.id, Day)) {
            return res.status(400).json({
                successful: false,
                message: `The professor ${assignation.Professor.Name} is not available at the specified time or would exceed the allowed teaching hours for ${Semester} semester.`
            });
        }

        // ******************** Additional Student (Section) Availability Validations ********************

        // For each section, check their current schedule for the day (excluding current schedule)
        // Now filtered by semester
        for (const sectionId of Sections) {
            const sectionSchedules = await Schedule.findAll({
                include: [
                    {
                        model: ProgYrSec,
                        where: { id: sectionId }
                    },
                    {
                        model: Assignation,
                        where: { Semester }
                    }
                ],
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
                    message: `Section with ID ${sectionId} cannot be updated at the specified time in ${Semester} semester, as it violates scheduling constraints (overlap or insufficient break between sessions).`
                });
            }

            // Check duration balance for each section with this course
            // Now filtered by semester
            const existingSectionSchedules = await Schedule.findAll({
                include: [
                    {
                        model: ProgYrSec,
                        where: { id: sectionId }
                    },
                    {
                        model: Assignation,
                        where: { 
                            CourseId: assignation.Course.id,
                            Semester
                        }
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
                    message: `For section with ID ${sectionId} in ${Semester} semester, adding ${updatedScheduleDuration} hours would exceed the course duration of ${courseTotalDuration} hours. Remaining balance: ${remainingHours} hours.`
                });
            }
        }

        // ******************** Check for Time Conflicts Among Section Schedules ********************

        // Get all schedules for the sections, excluding the schedule we are updating
        // Now filtered by semester
        const sectionSchedules = await Schedule.findAll({
            include: [
                {
                    model: ProgYrSec,
                    where: {
                        id: { [Op.in]: Sections }
                    }
                },
                {
                    model: Assignation,
                    where: { Semester }
                }
            ],
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
                    message: `Schedule conflict detected: Section with ID ${section} already has a schedule on ${currentDay} within ${Start_time} - ${End_time} for ${Semester} semester.`
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
        const {Semester} = req.body
        console.log(Semester)
        
        const sched = await Schedule.findAll({
            where: { RoomId: req.params.id },
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    where: { Semester: Semester },
                    attributes: ['id', 'School_Year', 'Semester', 'DepartmentId'],
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
                            attributes: ['Code', 'DepartmentId']
                        }
                    ],
                    through: { attributes: [] },
                    attributes: ['id','Year', 'Section']
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
        const profId = req.params.id;

        const scheds = await Schedule.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    // only include schedules linked to this professor
                    model: Assignation,
                    where: { ProfessorId: profId },
                    attributes: ['id', 'School_Year', 'Semester'],
                    include: [
                        {
                            model: Course,
                            attributes: ['Code', 'Description']
                        }
                    ]
                },
                {
                    // now pull in the room directly off Schedule
                    model: Room,
                    attributes: ['Code', 'Floor', 'Building'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['Type']
                        }
                    ]
                },
                {
                    model: ProgYrSec,
                    through: { attributes: [] },
                    attributes: ['Year', 'Section'],
                    include: [
                        {
                            model: Program,
                            attributes: ['Code']
                        }
                    ]
                }
            ],
            order: [
                ['Day', 'ASC'],
                ['Start_time', 'ASC']
            ]
        });

        if (!scheds.length) {
            return res.status(200).json({
                successful: true,
                message: 'No schedule found',
                count: 0,
                data: []
            });
        }

        res.status(200).json({
            successful: true,
            message: 'Retrieved all schedules',
            count: scheds.length,
            data: scheds
        });
    } catch (err) {
        console.error('Error in getSchedsByProf:', err);
        return res.status(500).json({
            successful: false,
            message: err.message || 'An unexpected error occurred.'
        });
    }
};

const getSchedsByDept = async (req, res, next) => {
    try {
        const deptId = req.params.id;

        const scheds = await Schedule.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    where: { DepartmentId: deptId },
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
                    // pull in the Room directly off Schedule
                    model: Room,
                    attributes: ['Code', 'Floor', 'Building'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['Type']
                        }
                    ]
                },
                {
                    model: ProgYrSec,
                    through: { attributes: [] },
                    attributes: ['Year', 'Section'],
                    include: [
                        {
                            model: Program,
                            attributes: ['id', 'Code']
                        }
                    ]
                }
            ],
            order: [
                ['Day', 'ASC'],
                ['Start_time', 'ASC']
            ]
        });

        if (!scheds.length) {
            return res.status(200).json({
                successful: true,
                message: 'No schedule found',
                count: 0,
                data: []
            });
        }

        res.status(200).json({
            successful: true,
            message: 'Retrieved all schedules',
            count: scheds.length,
            data: scheds
        });
    } catch (err) {
        console.error('Error in getSchedsByDept:', err);
        return res.status(500).json({
            successful: false,
            message: err.message || 'An unexpected error occurred.'
        });
    }
};



// Delete a Schedule by ID
const deleteSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { DepartmentId } = req.body

        const schedule = await Schedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({ successful: false, message: "Schedule not found." });
        }

        const assignation = await Assignation.findByPk(schedule.AssignationId);
        if (!assignation) {
            return res.status(404).json({ successful: false, message: "Assignation not found." });
        }
        // Check if the schedule belongs to the specified department
        if (assignation.DepartmentId !== DepartmentId) {
            return res.status(403).json({ successful: false, message: "Schedule does not belong to the specified department." });
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

//automateSchedule
module.exports = {
    addSchedule,
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