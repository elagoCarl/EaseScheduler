// Import required models and dependencies
const { Settings, Schedule, Room, Assignation, Program, Professor, Department, Course, ProfAvail, RoomType, SchoolYear } = require('../models');
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
 * Check if a schedule is possible based on room and professor availability.
 */
const isSchedulePossible = async (
    roomSchedules,
    professorSchedule,
    courseSchedules,
    roomId,
    professorId,
    day,
    startHour,
    duration,
    settings,
    priorities,
    courseId,
    roomCache,
    professorAvailabilityCache
) => {
    console.log(`Checking if schedule is possible: Room=${roomId}, Prof=${professorId || 'NONE'}, Day=${day}, Hour=${startHour}`);
    
    // Check if room is available
    if (!isRoomAvailable(roomSchedules, roomId, day, startHour, duration)) {
        console.log(`Room ${roomId} is not available at this time`);
        return false;
    }

    // Verify room has the required room type for this course
    const room = roomCache[roomId];
    const courseData = await Course.findByPk(courseId);
    
    // Check room type compatibility
    if (courseData?.RoomTypeId) {
        if (!room.RoomTypeIds || !room.RoomTypeIds.includes(courseData.RoomTypeId)) {
            console.log(`Room ${roomId} doesn't support required room type for course ${courseId}`);
            return false; // Room doesn't support this course's required room type
        }
    }

    // Check professor availability
    if (professorId && !canScheduleProfessor(
        professorSchedule[professorId][day],
        startHour, duration, settings, professorId, day,
        professorAvailabilityCache
    )) {
        console.log(`Professor ${professorId} is not available at this time`);
        return false;
    } else if (!professorId) {
        console.log(`No professor assigned - skipping professor availability check`);
    }

    console.log(`Schedule is possible!`);
    return true;
};

const isRoomAvailable = (roomSchedules, roomId, day, startHour, duration) => {
    if (!roomSchedules[roomId] || !roomSchedules[roomId][day]) return true;

    // Convert input to seconds for precision comparison
    const startTimeSeconds = typeof startHour === 'number' ? startHour * 3600 : timeToSeconds(startHour);
    const endTimeSeconds = typeof startHour === 'number' ? (startHour + duration) * 3600 :
        timeToSeconds(startHour) + (duration * 3600);

    return !roomSchedules[roomId][day].some(time => {
        // Convert scheduled times to seconds if they're not already
        const timeStartSeconds = typeof time.start === 'number' && time.start < 100 ?
            time.start * 3600 : (typeof time.start === 'string' ?
                timeToSeconds(time.start) : time.start);
        const timeEndSeconds = typeof time.end === 'number' && time.end < 100 ?
            time.end * 3600 : (typeof time.end === 'string' ?
                timeToSeconds(time.end) : time.end);

        return (startTimeSeconds >= timeStartSeconds && startTimeSeconds < timeEndSeconds) ||
            (endTimeSeconds > timeStartSeconds && endTimeSeconds <= timeEndSeconds) ||
            (startTimeSeconds <= timeStartSeconds && endTimeSeconds >= timeEndSeconds);
    });
};

const canScheduleProfessor = (profSchedule, startHour, duration, settings, professorId, day, professorAvailabilityCache) => {
    const requiredBreak = settings.ProfessorBreak || 1; // Default break duration: 1 hour
    const requiredBreakSeconds = requiredBreak * 3600;
    const maxContinuousHours = settings.maxAllowedGap || 5; // Max hours before break is required
    const maxContinuousSeconds = maxContinuousHours * 3600;

    // Convert input to seconds
    const startTimeSeconds = typeof startHour === 'number' ? startHour * 3600 : timeToSeconds(startHour);
    const endTimeSeconds = typeof startHour === 'number' ? (startHour + duration) * 3600 :
        timeToSeconds(startHour) + (duration * 3600);
    const durationSeconds = duration * 3600;

    // Use the cached professor availability data
    const cacheKey = `prof-${professorId}`;
    let profAvails = [];

    if (professorAvailabilityCache[cacheKey]) {
        // Filter the cached data for this specific day
        profAvails = professorAvailabilityCache[cacheKey].filter(avail =>
            avail.Day === day.toString() ||
            avail.Day === convertDayNumberToName(day)
        );
    } else {
        // If no cached data, assume available (will be checked in main function)
        return true;
    }

    // If the professor has availability records but none for this day, they're unavailable
    const anyAvailRecords = professorAvailabilityCache[`prof-count-${professorId}`];
    if (anyAvailRecords > 0 && profAvails.length === 0) {
        return false;
    } else if (profAvails.length > 0) {
        // If they have records for this day, check if the proposed time falls within any availability window
        let isAvailable = false;
        for (const avail of profAvails) {
            const availStartSeconds = timeToSeconds(avail.Start_time);
            const availEndSeconds = timeToSeconds(avail.End_time);

            if (startTimeSeconds >= availStartSeconds && endTimeSeconds <= availEndSeconds) {
                isAvailable = true;
                break;
            }
        }

        if (!isAvailable) return false;
    }

    // Check if adding this schedule would exceed max hours
    if (profSchedule.hours + duration > settings.ProfessorMaxHours) return false;

    // Check for overlapping schedules with second precision
    for (const time of profSchedule.dailyTimes) {
        // Convert scheduled times to seconds
        const timeStartSeconds = typeof time.start === 'number' && time.start < 100 ?
            time.start * 3600 : (typeof time.start === 'string' ?
                timeToSeconds(time.start) : time.start);
        const timeEndSeconds = typeof time.end === 'number' && time.end < 100 ?
            time.end * 3600 : (typeof time.end === 'string' ?
                timeToSeconds(time.end) : time.end);

        if ((startTimeSeconds >= timeStartSeconds && startTimeSeconds < timeEndSeconds) ||
            (endTimeSeconds > timeStartSeconds && endTimeSeconds <= timeEndSeconds) ||
            (startTimeSeconds <= timeStartSeconds && endTimeSeconds >= timeEndSeconds)) {
            return false;
        }
    }

    // If no schedules yet, no need to check for contiguous blocks
    if (profSchedule.dailyTimes.length === 0) {
        return durationSeconds <= maxContinuousSeconds; // Check if this single class exceeds max continuous hours
    }

    // Sort schedules and convert to seconds
    const intervals = [...profSchedule.dailyTimes.map(time => {
        return {
            start: typeof time.start === 'number' && time.start < 100 ?
                time.start * 3600 : (typeof time.start === 'string' ?
                    timeToSeconds(time.start) : time.start),
            end: typeof time.end === 'number' && time.end < 100 ?
                time.end * 3600 : (typeof time.end === 'string' ?
                    timeToSeconds(time.end) : time.end)
        };
    }), { start: startTimeSeconds, end: endTimeSeconds }]
        .sort((a, b) => a.start - b.start);

    // Track continuous teaching blocks
    for (let i = 0; i < intervals.length - 1; i++) {
        const current = intervals[i];
        const next = intervals[i + 1];

        // Check if this is the new proposed schedule adjacent to an existing one
        if (next.start === startTimeSeconds || current.start === startTimeSeconds) {
            // Case 1: This new class creates or extends a continuous block
            if (next.start === current.end) {
                // Classes are adjacent - check if combined duration exceeds max continuous hours
                const continuousDuration = next.end - current.start;
                if (continuousDuration > maxContinuousSeconds) {
                    return false; // Exceeds max continuous teaching hours
                }
            }
            // Case 2: Check if there's enough break between classes
            else if (next.start < current.end + requiredBreakSeconds && next.start > current.end) {
                return false; // Not enough break time
            }
            // Case 3: Check if this class itself exceeds max continuous hours
            else if (durationSeconds > maxContinuousSeconds) {
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
            if (contiguousEnd - contiguousStart > maxContinuousSeconds) {
                return false;
            }
        } else {
            // There's a gap between intervals
            const gap = intervals[i].start - contiguousEnd;

            // If the previous block reached maximum allowed hours, check if there's enough break
            if (contiguousEnd - contiguousStart >= maxContinuousSeconds && gap < requiredBreakSeconds) {
                return false; // Not enough break after reaching max continuous hours
            }

            // Start a new contiguous block
            contiguousStart = intervals[i].start;
            contiguousEnd = intervals[i].end;
        }
    }

    return true;
};

const scheduleAssignation = async (
    assignations,
    rooms,
    professorSchedule,
    courseSchedules,
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
    roomCache,
    professorAvailabilityCache
) => {
    // Base case: all assignations handled
    if (index === assignations.length) return true;

    // Log all assignations being received at the start
    if (index === 0) {
        console.log("===== ALL ASSIGNATIONS RECEIVED =====");
        assignations.forEach((a, i) => {
            console.log(`Assignation ${i}: Course ${a.Course?.Code}, Professor: ${a.Professor?.Name || 'NONE'}`);
        });
        console.log("====================================");
    }

    const assignation = assignations[index];
    const { Course: courseParam, Professor: professorInfo } = assignation;
    const duration = courseParam.Duration;

    // Log the current assignation being processed
    console.log(`\nProcessing assignation ${index}: Course ${courseParam.Code}, Professor: ${professorInfo?.Name || 'NONE'}`);
    
    try {
        // --- 1) Build the candidate room list, enforcing RoomType === assignation.RoomType ---
        // build two lists: prioritized, then the rest
        const prioritizedList = priorities?.room
            ? rooms.filter(r => priorities.room.includes(r.id))
            : [];
        const fallbackList = priorities?.room
            ? rooms.filter(r => !priorities.room.includes(r.id))
            : rooms;

        // Combine room lists
        let roomsToTry = [
            ...prioritizedList,
            ...fallbackList
        ].filter(r => r.RoomTypeId === assignation.RoomTypeId);

        // Further sort rooms by moving "lec" to the end
        roomsToTry.sort((a, b) => {
            // Get room types from roomCache
            const aRoomTypes = roomCache[a.id]?.RoomTypeIds || [];
            const bRoomTypes = roomCache[b.id]?.RoomTypeIds || [];

            // Check for "lec" room type in the cached data
            const aHasLecType = aRoomTypes.some(typeId => {
                // Get the room type object
                const roomTypeObj = a.TypeRooms?.find(rt => rt.id === typeId);
                return roomTypeObj && roomTypeObj.Name?.toLowerCase().includes('lec');
            });

            const bHasLecType = bRoomTypes.some(typeId => {
                const roomTypeObj = b.TypeRooms?.find(rt => rt.id === typeId);
                return roomTypeObj && roomTypeObj.Name?.toLowerCase().includes('lec');
            });

            // If only one has "lec" type, put it last
            if (aHasLecType && !bHasLecType) return 1;
            if (!aHasLecType && bHasLecType) return -1;
            return 0;
        });

        console.log(`Found ${roomsToTry.length} compatible rooms for course ${courseParam.Code}`);

        if (!roomsToTry.length) {
            console.log(`Failed to schedule - No compatible rooms found for course ${courseParam.Code}`);
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo?.Name,
                reason: "No rooms of matching RoomType available"
            });
            return scheduleAssignation(
                assignations, rooms, professorSchedule, courseSchedules,
                roomSchedules, index + 1,
                report, startHour, endHour, settings, priorities,
                failedAssignations, roomId, seed, roomCache, professorAvailabilityCache
            );
        }

        // --- 2) For variants, introduce different scheduling patterns ---
        // Variant-specific room ordering based on seed
        if (seed % 3 === 0) {
            // Sort rooms by capacity ascending
            roomsToTry.sort((a, b) => a.NumberOfSeats - b.NumberOfSeats);
        } else if (seed % 3 === 1) {
            // Sort rooms by capacity descending
            roomsToTry.sort((a, b) => b.NumberOfSeats - a.NumberOfSeats);
        }

        // --- 3) Try scheduling on each day and room ---
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

        let successfullyScheduled = false;

        // Try each room
        for (const room of roomsToTry) {
            if (successfullyScheduled) break;

            // Try each day
            for (const day of dayOrdering) {
                if (successfullyScheduled) break;

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

                // Try each hour
                for (let hour of hourOptions) {
                    console.log(`Trying room ${room.Code}, day ${day}, hour ${hour} for course ${courseParam.Code}`);
                    
                    const isPossible = await isSchedulePossible(
                        roomSchedules, 
                        professorSchedule, 
                        courseSchedules,
                        room.id, 
                        professorInfo?.id, 
                        day, 
                        hour,
                        duration, 
                        settings, 
                        priorities, 
                        courseParam.id,
                        roomCache, 
                        professorAvailabilityCache
                    );

                    if (isPossible) {
                        console.log(`SUCCESS! Found viable slot for ${courseParam.Code} in room ${room.Code}, day ${day}, hour ${hour}`);
                        
                        // Update trackers
                        if (professorInfo) {
                            professorSchedule[professorInfo.id][day].hours += duration;
                            professorSchedule[professorInfo.id][day].dailyTimes.push({ 
                                start: hour, 
                                end: hour + duration 
                            });
                        } else {
                            console.log(`No professor to update for ${courseParam.Code}`);
                        }

                        courseSchedules[courseParam.id][day].push({ 
                            start: hour, 
                            end: hour + duration 
                        });
                        
                        roomSchedules[room.id] = roomSchedules[room.id] || {};
                        roomSchedules[room.id][day] = roomSchedules[room.id][day] || [];
                        roomSchedules[room.id][day].push({ 
                            start: hour, 
                            end: hour + duration 
                        });

                        // Record the schedule
                        report.push({
                            Professor: professorInfo?.Name,
                            Course: courseParam.Code,
                            CourseType: courseParam.Type,
                            Room: room.Code,
                            RoomId: room.id,
                            Day: day,
                            Start_time: `${hour}:00`,
                            End_time: `${hour + duration}:00`,
                            isLocked: false,
                            AssignationId: assignation.id
                        });

                        successfullyScheduled = true;
                        break; // Found a suitable time slot, stop checking hours
                    } else {
                        console.log(`Cannot schedule at this time slot - conflicts exist`);
                    }
                }
            }
        }

        // If couldn't schedule, add to failed assignations
        if (!successfullyScheduled) {
            console.log(`FAILED to schedule course ${courseParam.Code}`);
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo?.Name,
                reason: "Could not find suitable time slot"
            });
        }

        // Move on to next assignation regardless of success
        return scheduleAssignation(
            assignations, rooms, professorSchedule, courseSchedules,
            roomSchedules, index + 1,
            report, startHour, endHour, settings, priorities,
            failedAssignations, roomId, seed, roomCache, professorAvailabilityCache
        );

    } catch (err) {
        console.error("Error in scheduleAssignation:", err);
        failedAssignations.push({
            id: assignation.id,
            Course: courseParam.Code,
            Professor: professorInfo?.Name,
            reason: `Error: ${err.message}`
        });
        return scheduleAssignation(
            assignations, rooms, professorSchedule, courseSchedules,
            roomSchedules, index + 1,
            report, startHour, endHour, settings, priorities,
            failedAssignations, roomId, seed, roomCache, professorAvailabilityCache
        );
    }
};

const generateScheduleVariants = async (req, res, next) => {
    try {
        const {
            DepartmentId,
            prioritizedProfessor,
            prioritizedRoom,
            roomId,
            variantCount = 2, // Default to 2 variants
            semester
        } = req.body;

        if (!DepartmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department ID is required."
            });
        }

        // Start measuring execution time
        const startTime = Date.now();

        if (!semester) {
            return res.status(400).json({
                successful: false,
                message: "Semester is required."
            });
        }

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
        // If we're forcing a specific room, drop any prioritizedRoom filter
        if (roomId) {
            delete priorities.room;
        }

        console.log(`→ Fetching settings for DepartmentId=${DepartmentId}`)
        // 2) Load settings
        
        const settings = await Settings.findOne({where: 1});
        if (!settings) {
            console.log(`⚠️  No settings found for DepartmentId=${DepartmentId}`);
        } else {
            console.log('✅  Loaded settings:', settings.get({ plain: true }));
            console.log(
                `Using settings for Dept ${settings}:`,
                `StartHour=${settings.StartHour},`,
                `EndHour=${settings.EndHour},`,
                `StudentMaxHours=${settings.StudentMaxHours}`
            );
        }
        const { StartHour, EndHour } = settings;

        // Create caches for better performance - defining at the top for scope
        const roomCache = {};
        const professorAvailabilityCache = {};

        // 3) OPTIMIZATION: Fetch department, assignations, courses, professors, and rooms all in one go
        const department = await Department.findByPk(DepartmentId, {
            include: [
                {
                    model: Assignation,
                    where: {
                        Semester: semester
                    },
                    include: [
                        {
                            model: Course,
                            // Include PairId to identify paired courses
                            attributes: ['id', 'Code', 'Description', 'Duration', 'Type', 'RoomTypeId', 'PairId']
                        },
                        { model: Professor, attributes: ['id', 'Name'] }
                    ]
                },
                {
                    model: Room,
                    as: 'DeptRooms',
                    include: [{
                        model: RoomType,
                        as: 'TypeRooms', // This matches your association name
                        through: { attributes: [] } // Don't include junction table attributes
                    }]
                }
            ]
        });

        if (!department) {
            return res.status(404).json({
                successful: false,
                message: "Department not found."
            });
        }

        const assignations = department.Assignations;
        // If no assignations found for this semester, return early
        if (!assignations || assignations.length === 0) {
            return res.status(400).json({
                successful: false,
                message: `No assignations found for ${semester} semester.`
            });
        }

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

        // OPTIMIZATION: Cache all rooms data
        rooms.forEach(room => {
            roomCache[room.id] = {
                id: room.id,
                Code: room.Code,
                NumberOfSeats: room.NumberOfSeats,
                // Store array of room type IDs
                RoomTypeIds: room.TypeRooms ? room.TypeRooms.map(rt => rt.id) : []
            };
        });

        // 4) Get existing locked schedules for this department
        const assignationIds = assignations.map(a => a.id);

        // OPTIMIZATION: Eager load all locked schedules with related data
        const lockedSchedules = await Schedule.findAll({
            where: {
                AssignationId: { [Op.in]: assignationIds },
                isLocked: true
            },
            include: [
                { model: Room },
                {
                    model: Assignation,
                    where: { Semester: semester },
                    include: [
                        { model: Course },
                        { model: Professor, attributes: ['id', 'Name'] }
                    ]
                }
            ]
        });

        console.log(`Found ${lockedSchedules.length} locked schedules`);

        // 5) OPTIMIZATION: Get ALL existing schedules for ANY room that might be used in one query
        const roomIds = rooms.map(r => r.id);

        const allRoomSchedules = await Schedule.findAll({
            where: {
                RoomId: { [Op.in]: roomIds }
            },
            include: [
                { model: Room },
                {
                    model: Assignation,
                    where: { Semester: semester }
                }
            ]
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

        // OPTIMIZATION: Preload all professor availability data at once
        const allProfIds = new Set([
            ...assignations.map(a => a.Professor?.id).filter(Boolean)
        ]);

        // Batch fetch all professor availability data
        const allProfAvailability = await ProfAvail.findAll({
            where: {
                ProfessorId: { [Op.in]: [...allProfIds] }
            }
        });

        // Organize by professor ID for quick access
        allProfAvailability.forEach(avail => {
            const cacheKey = `prof-${avail.ProfessorId}`;
            if (!professorAvailabilityCache[cacheKey]) {
                professorAvailabilityCache[cacheKey] = [];
            }
            professorAvailabilityCache[cacheKey].push(avail);
        });

        // Also cache availability counts per professor
        [...allProfIds].forEach(profId => {
            const availData = professorAvailabilityCache[`prof-${profId}`] || [];
            professorAvailabilityCache[`prof-count-${profId}`] = availData.length;
        });

        // 7) MODIFICATION: First prioritize courses with PairId, and then within that apply other priorities
        // Split assignations into paired and non-paired
        const pairedAssignations = unscheduledAssignations.filter(a => a.Course?.PairId);
        const nonPairedAssignations = unscheduledAssignations.filter(a => !a.Course?.PairId);

        // Group paired assignations by PairId
        const pairGroups = {};
        pairedAssignations.forEach(a => {
            const pairId = a.Course.PairId;
            if (!pairGroups[pairId]) {
                pairGroups[pairId] = [];
            }
            pairGroups[pairId].push(a);
        });

        // Sort within pair groups if professor priorities exist
        if (priorities.professor) {
            // Sort paired assignations within each pair group
            Object.keys(pairGroups).forEach(pairId => {
                pairGroups[pairId].sort((a, b) => {
                    const aP = priorities.professor.includes(a.Professor?.id);
                    const bP = priorities.professor.includes(b.Professor?.id);
                    return (bP === aP) ? 0 : (aP ? -1 : 1);
                });
            });
            
            // Sort non-paired assignations by professor priority
            nonPairedAssignations.sort((a, b) => {
                const aP = priorities.professor.includes(a.Professor?.id);
                const bP = priorities.professor.includes(b.Professor?.id);
                return (bP === aP) ? 0 : (aP ? -1 : 1);
            });
        }
            
        // Create a flattened list of paired assignations grouped by their pairs
        const orderedPairedAssignations = Object.values(pairGroups).flat();

        // Combine the sorted lists: paired assignations first, then non-paired
        unscheduledAssignations = [...orderedPairedAssignations, ...nonPairedAssignations];
        
        console.log(`Prioritized ${orderedPairedAssignations.length} paired courses out of ${unscheduledAssignations.length} total assignations`);

        // Modify room ordering to place "lec" types at the end
        rooms.sort((a, b) => {
            // Get room types from cache
            const aRoomTypes = roomCache[a.id]?.RoomTypeIds || [];
            const bRoomTypes = roomCache[b.id]?.RoomTypeIds || [];

            // Check if any room type contains "lec" (case insensitive)
            const aHasLecType = aRoomTypes.some(typeId => {
                const typeObj = a.TypeRooms?.find(tr => tr.id === typeId);
                return typeObj && typeObj.Name?.toLowerCase().includes('lec');
            });

            const bHasLecType = bRoomTypes.some(typeId => {
                const typeObj = b.TypeRooms?.find(tr => tr.id === typeId);
                return typeObj && typeObj.Name?.toLowerCase().includes('lec');
            });

            // If only one has "lec" type, put it last
            if (aHasLecType && !bHasLecType) return 1;
            if (!aHasLecType && bHasLecType) return -1;
            return 0;
        });

        // 8) Array to store our variants
        const scheduleVariants = [];

        // Generate multiple schedule variants
        for (let variant = 0; variant < variantCount; variant++) {
            console.log(`\n====== Generating variant ${variant + 1} of ${variantCount} ======`);

            // 9a) Initialize tracking structures
            const professorSchedule = {}, courseSchedules = {}, roomSchedules = {};

            // 9b) Initialize structures for this variant
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

            // 9c) Initialize roomSchedules with ALL existing schedules from all departments
            for (const sch of allRoomSchedules) {
                const day = sch.Day;
                const startTimeSeconds = timeToSeconds(sch.Start_time);
                const endTimeSeconds = timeToSeconds(sch.End_time);

                // Room schedules from ALL departments
                if (!roomSchedules[sch.RoomId]) roomSchedules[sch.RoomId] = {};
                if (!roomSchedules[sch.RoomId][day]) roomSchedules[sch.RoomId][day] = [];
                roomSchedules[sch.RoomId][day].push({
                    start: startTimeSeconds,
                    end: endTimeSeconds
                });
            }

            // Now also add our department's locked schedules to the tracking structures
            for (const sch of lockedSchedules) {
                if (!sch.Assignation?.Professor || !sch.Assignation?.Course) continue;

                const day = sch.Day;
                // Convert time strings to seconds for precision
                const startTimeSeconds = timeToSeconds(sch.Start_time);
                const endTimeSeconds = timeToSeconds(sch.End_time);
                // Still calculate duration in hours for tracking total hours
                const dur = (endTimeSeconds - startTimeSeconds) / 3600;

                // Professor
                if (sch.Assignation.Professor) {
                    const profId = sch.Assignation.Professor.id;
                    professorSchedule[profId][day].hours += dur;
                    professorSchedule[profId][day].dailyTimes.push({
                        start: startTimeSeconds,
                        end: endTimeSeconds
                    });
                }

                // Course
                courseSchedules[sch.Assignation.Course.id][day].push({
                    start: startTimeSeconds,
                    end: endTimeSeconds
                });
            }

            // 10) For each variant, preserve priority ordering but apply variation to non-priority items
            // Clone unscheduled assignations for this variant
            let variantAssignations = [...unscheduledAssignations];

            // IMPORTANT: For variants after the first, we need to maintain pair grouping
            if (variant > 0) {
                // First extract all paired assignations, keeping them grouped
                const pairedGroups = {};
                const nonPairedList = [];
                
                variantAssignations.forEach(a => {
                    if (a.Course?.PairId) {
                        if (!pairedGroups[a.Course.PairId]) {
                            pairedGroups[a.Course.PairId] = [];
                        }
                        pairedGroups[a.Course.PairId].push(a);
                    } else {
                        nonPairedList.push(a);
                    }
                });
                
                // Shuffle the order of pairs (as groups), not individual paired courses
                const pairIds = Object.keys(pairedGroups);
                const shuffledPairIds = shuffleDeterministic([...pairIds], variant);
                
                // Shuffle non-paired courses
                const shuffledNonPaired = shuffleDeterministic([...nonPairedList], variant);
                
                // Reconstruct the list with the new ordering, keeping pairs together
                variantAssignations = [];
                shuffledPairIds.forEach(pairId => {
                    variantAssignations.push(...pairedGroups[pairId]);
                });
                variantAssignations.push(...shuffledNonPaired);
            }

            // Handle room prioritization - split, shuffle non-priority, recombine
            let variantRooms = [...rooms];
            if (priorities.room && variant > 0) {
                const prioritizedRooms = variantRooms.filter(r =>
                    priorities.room.includes(r.id));
                const nonPrioritizedRooms = variantRooms.filter(r =>
                    !priorities.room.includes(r.id));

                // Only shuffle the non-prioritized rooms
                const shuffledNonPriorityRooms = shuffleDeterministic([...nonPrioritizedRooms], variant);

                // Recombine while preserving priority order
                variantRooms = [...prioritizedRooms, ...shuffledNonPriorityRooms];
            } else if (variant > 0) {
                // If no room priorities, shuffle everything
                variantRooms = shuffleDeterministic([...rooms], variant);
            }

            rooms = variantRooms;

            // 11) Run scheduler with this variant's configuration
            const report = [], failedAssignations = [];
            const variantSeed = variant + 1; // Use variant number as seed

            // Run scheduling algorithm with cached data
            await scheduleAssignation(
                variantAssignations,
                rooms,
                professorSchedule,
                courseSchedules,
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
                professorAvailabilityCache
            );

            console.log(`Variant ${variant + 1} results: ${report.length} scheduled, ${failedAssignations.length} failed`);

            // 12) Store both locked schedules and newly generated ones for this variant
            const combinedReport = [
                ...lockedSchedules.map(sch => {
                    return {
                        id: sch.id,
                        Professor: sch.Assignation?.Professor?.Name,
                        Course: sch.Assignation?.Course?.Code,
                        CourseType: sch.Assignation?.Course?.Type,
                        Room: sch.Room?.Code,
                        RoomId: sch.RoomId,
                        Day: sch.Day,
                        Start_time: sch.Start_time,
                        End_time: sch.End_time,
                        isLocked: true,
                        AssignationId: sch.AssignationId
                    };
                }),
                ...report
            ];

            scheduleVariants.push({
                variantName: `Variant ${variant + 1}`,
                schedules: combinedReport,
                failedAssignations: failedAssignations,
                successRate: `${report.length} of ${unscheduledAssignations.length} assignations scheduled`
            });
        }

        // 13) Form response with execution time
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
        const { variant, DepartmentId, semester } = req.body;

        if (!semester) {
            return res.status(400).json({
                successful: false,
                message: "Invalid request: semester is required."
            });
        }
        if (!variant || !variant.schedules || !DepartmentId) {
            return res.status(400).json({
                successful: false,
                message: "Invalid request: variant schedules and department ID are required."
            });
        }

        // 1. Get all existing schedules for this department that aren't locked
        const department = await Department.findByPk(DepartmentId, {
            include: [{
                model: Assignation, where: {
                    Semester: semester
                }, attributes: ['id']
            }]
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
        return res.status(500).json({ successful: false, message: error.message || "An unexpected error occurred." });
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

// Add Schedule (Manual Version)
const addSchedule = async (req, res, next) => {
    try {
        let schedules = Array.isArray(req.body) ? req.body : [req.body];
        const createdSchedules = [];

        for (const sched of schedules) {
            const { Day, Start_time, End_time, RoomId, AssignationId } = sched;

            if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            const assignation = await Assignation.findByPk(AssignationId, {
                include: [
                    { model: Course },
                    { model: Professor },
                    { model: SchoolYear }
                ]
            });

            if (!assignation || !assignation.Course || !assignation.SchoolYear) {
                return res.status(404).json({
                    successful: false,
                    message: `Assignation with ID ${AssignationId} not found or missing course/school year details.`
                });
            }

            const { Semester } = assignation;
            const SchoolYearId = assignation.SchoolYear.id;
            const SchoolYearName = assignation.SchoolYear.SY_Name;

            const settings = await Settings.findOne({ where: { DepartmentId: assignation.DepartmentId } });
            if (!settings) {
                return res.status(500).json({
                    successful: false,
                    message: "Settings could not be retrieved. Please try again later."
                });
            }

            if (isValidTime(Start_time, End_time, res) !== true) return;

            const newStartSec = timeToSeconds(Start_time);
            const newEndSec = timeToSeconds(End_time);
            const currentScheduleDuration = (newEndSec - newStartSec) / 3600;

            const room = await Room.findByPk(RoomId, {
                include: [{
                    model: RoomType,
                    as: 'TypeRooms',
                    attributes: ['id', 'Type'],
                    through: { attributes: [] }
                }, {
                    model: RoomType,
                    attributes: ['id', 'Type']
                }]
            });

            if (!room) {
                return res.status(404).json({
                    successful: false,
                    message: `Room with ID ${RoomId} not found. Please provide a valid RoomId.`
                });
            }

            const courseRoomTypeId = assignation.Course.RoomTypeId;

            // Check if the room's primary type matches the course's required type
            const primaryTypeMatches = room.PrimaryTypeId === courseRoomTypeId;

            // Check if any of the room's associated types match the course's required type
            const roomHasRequiredType = room.TypeRooms.some(type => type.id === courseRoomTypeId);

            if (!primaryTypeMatches && !roomHasRequiredType) {
                const requiredRoomType = await RoomType.findByPk(courseRoomTypeId);
                const requiredTypeName = requiredRoomType ? requiredRoomType.Type : "required type";
                const primaryTypeName = room.RoomType ? room.RoomType.Type : "None";
                const availableTypes = room.TypeRooms.map(type => type.Type).join(", ");

                return res.status(400).json({
                    successful: false,
                    message: `Room type mismatch: Course requires room type ${requiredTypeName} but Room ${room.Code} has primary type ${primaryTypeName} and additional types: [${availableTypes}].`
                });
            }

            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentDay = days[Day - 1];

            const existingRoomSchedules = await Schedule.findAll({
                include: [{
                    model: Assignation,
                    where: { Semester, SchoolYearId }
                }],
                where: { Day, RoomId }
            });

            const isRoomConflict = existingRoomSchedules.some(existing => {
                const existingStartSec = timeToSeconds(existing.Start_time);
                const existingEndSec = timeToSeconds(existing.End_time);
                return (newStartSec < existingEndSec && newEndSec > existingStartSec);
            });

            if (isRoomConflict) {
                return res.status(400).json({
                    successful: false,
                    message: `Schedule conflict detected: Room ${room.Code} is already booked on ${currentDay} within ${Start_time} - ${End_time} for ${Semester} semester, ${SchoolYearName}.`
                });
            }

            if (assignation.Professor) {
                const professorId = assignation.Professor.id;
                const professorAvailabilities = await ProfAvail.findAll({
                    where: {
                        ProfessorId: professorId,
                        Day: currentDay
                    }
                });

                if (professorAvailabilities.length === 0) {
                    return res.status(400).json({
                        successful: false,
                        message: `Professor ${assignation.Professor.Name} has no availability set for ${currentDay}.`
                    });
                }

                const isProfessorAvailable = professorAvailabilities.some(availability => {
                    const availStartSec = timeToSeconds(availability.Start_time);
                    const availEndSec = timeToSeconds(availability.End_time);
                    return (newStartSec >= availStartSec && newEndSec <= availEndSec);
                });

                if (!isProfessorAvailable) {
                    return res.status(400).json({
                        successful: false,
                        message: `Professor ${assignation.Professor.Name} is not available during ${Start_time} - ${End_time} on ${currentDay}.`
                    });
                }

                const professorSchedules = await Schedule.findAll({
                    include: [{
                        model: Assignation,
                        where: { ProfessorId: professorId, Semester, SchoolYearId }
                    }],
                    where: { Day }
                });

                let profScheduleForDay = { hours: 0, dailyTimes: [] };
                professorSchedules.forEach(s => {
                    const startSec = timeToSeconds(s.Start_time);
                    const endSec = timeToSeconds(s.End_time);
                    const durationHours = (endSec - startSec) / 3600; // Convert seconds to hours with decimal precision
                    profScheduleForDay.hours += durationHours;

                    // Parse hours and minutes for more detailed time management
                    const [startHour, startMin] = s.Start_time.split(':').map(Number);
                    const [endHour, endMin] = s.End_time.split(':').map(Number);

                    profScheduleForDay.dailyTimes.push({
                        start: startHour + (startMin / 60), // Convert to decimal hours
                        end: endHour + (endMin / 60),
                        startTime: s.Start_time,
                        endTime: s.End_time
                    });
                });

                // Parse start time with minute precision
                const [startHour, startMin] = Start_time.split(':').map(Number);
                const newStartHourDecimal = startHour + (startMin / 60); // Decimal hours for more precise calculation

                const isProfessorScheduleConflict = professorSchedules.some(existing => {
                    const existingStartSec = timeToSeconds(existing.Start_time);
                    const existingEndSec = timeToSeconds(existing.End_time);
                    return (newStartSec < existingEndSec && newEndSec > existingStartSec);
                });

                if (isProfessorScheduleConflict) {
                    return res.status(400).json({
                        successful: false,
                        message: `Professor ${assignation.Professor.Name} has a scheduling conflict during ${Start_time} - ${End_time} on day ${currentDay} for ${Semester} semester, ${SchoolYearName}.`
                    });
                }

                const allProfAvailability = await ProfAvail.findAll({
                    where: { ProfessorId: professorId }
                });

                const professorAvailabilityCache = {};
                allProfAvailability.forEach(avail => {
                    const cacheKey = `prof-${avail.ProfessorId}`;
                    if (!professorAvailabilityCache[cacheKey]) {
                        professorAvailabilityCache[cacheKey] = [];
                    }
                    professorAvailabilityCache[cacheKey].push(avail);
                });

                const availData = professorAvailabilityCache[`prof-${professorId}`] || [];
                professorAvailabilityCache[`prof-count-${professorId}`] = availData.length;

                if (!(canScheduleProfessor(profScheduleForDay, newStartHourDecimal, currentScheduleDuration, settings, professorId, Day, professorAvailabilityCache))) {
                    return res.status(400).json({
                        successful: false,
                        message: `The professor ${assignation.Professor.Name} would exceed the allowed teaching hours for ${Semester} semester, ${SchoolYearName}.`
                    });
                }
            }

            // Check course duration (without considering sections)
            const existingCourseSchedules = await Schedule.findAll({
                include: [{
                    model: Assignation,
                    where: {
                        CourseId: assignation.Course.id,
                        Semester,
                        SchoolYearId
                    }
                }]
            });

            let scheduledHours = 0;
            existingCourseSchedules.forEach(sched => {
                const schedStart = timeToSeconds(sched.Start_time);
                const schedEnd = timeToSeconds(sched.End_time);
                scheduledHours += (schedEnd - schedStart) / 3600;
            });

            if (scheduledHours + currentScheduleDuration > assignation.Course.Duration) {
                const remainingHours = assignation.Course.Duration - scheduledHours;
                return res.status(400).json({
                    successful: false,
                    message: `Adding ${currentScheduleDuration} hours would exceed the course duration of ${assignation.Course.Duration} hours. Remaining balance: ${remainingHours} hours.`
                });
            }

            const newSchedule = await Schedule.create({
                Day,
                Start_time,
                End_time,
                RoomId,
                AssignationId
            });

            createdSchedules.push(newSchedule);
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully created schedules.",
            schedules: createdSchedules
        });

    } catch (error) {
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
        const { Day, Start_time, End_time, RoomId, AssignationId } = req.body;

        // Check required fields
        if (!util.checkMandatoryFields([Day, Start_time, End_time, RoomId, AssignationId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        // Validate if the schedule exists
        const schedule = await Schedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({
                successful: false,
                message: "Schedule not found."
            });
        }

        const assignation = await Assignation.findByPk(AssignationId, {
            include: [
                { model: Course },
                { model: Professor },
                { model: SchoolYear }
            ]
        });

        if (!assignation || !assignation.Course || !assignation.SchoolYear) {
            return res.status(404).json({
                successful: false,
                message: `Assignation with ID ${AssignationId} not found or missing course/school year details.`
            });
        }

        const Semester = assignation.Semester;
        const SchoolYearId = assignation.SchoolYear.id;
        const SchoolYearName = assignation.SchoolYear.SY_Name;

        const settings = await Settings.findOne({ where: { DepartmentId: assignation.DepartmentId } });
        if (!settings) {
            return res.status(500).json({
                successful: false,
                message: "Settings could not be retrieved. Please try again later."
            });
        }

        // Validate time format and order
        if (isValidTime(Start_time, End_time, res) !== true) return;

        // Calculate duration of the proposed schedule in hours with minute precision
        const newStartSec = timeToSeconds(Start_time);
        const newEndSec = timeToSeconds(End_time);
        const currentScheduleDuration = (newEndSec - newStartSec) / 3600; // seconds to hours

        // Fetch and validate the room
        const room = await Room.findByPk(RoomId, {
            include: [
                {
                    model: RoomType,
                    as: 'TypeRooms',
                    attributes: ['id', 'Type'],
                    through: { attributes: [] }
                },
                {
                    model: RoomType,
                    attributes: ['id', 'Type']
                }
            ]
        });

        if (!room) {
            return res.status(404).json({
                successful: false,
                message: `Room with ID ${RoomId} not found. Please provide a valid RoomId.`
            });
        }

        const courseRoomTypeId = assignation.Course.RoomTypeId;

        // Check if the room's primary type matches the course's required type
        const primaryTypeMatches = room.PrimaryTypeId === courseRoomTypeId;

        // Check if any of the room's associated types match the course's required type
        const roomHasRequiredType = room.TypeRooms.some(type => type.id === courseRoomTypeId);

        if (!primaryTypeMatches && !roomHasRequiredType) {
            const requiredRoomType = await RoomType.findByPk(courseRoomTypeId);
            const requiredTypeName = requiredRoomType ? requiredRoomType.Type : "required type";
            const primaryTypeName = room.RoomType ? room.RoomType.Type : "None";
            const availableTypes = room.TypeRooms.map(type => type.Type).join(", ");

            return res.status(400).json({
                successful: false,
                message: `Room type mismatch: Course requires room type ${requiredTypeName} but Room ${room.Code} has primary type ${primaryTypeName} and additional types: [${availableTypes}].`
            });
        }

        // Check for conflicting schedules in the same room on the same day - filtered by semester and school year
        const existingRoomSchedules = await Schedule.findAll({
            include: [{
                model: Assignation,
                where: {
                    Semester,
                    SchoolYearId
                }
            }],
            where: {
                Day,
                RoomId,
                id: { [Op.ne]: id } // Exclude current schedule
            }
        });

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[Day - 1];

        // Allow back-to-back schedules but check for any overlaps
        const isRoomConflict = existingRoomSchedules.some(existing => {
            const existingStartSec = timeToSeconds(existing.Start_time);
            const existingEndSec = timeToSeconds(existing.End_time);
            return (newStartSec < existingEndSec && newEndSec > existingStartSec);
        });

        if (isRoomConflict) {
            return res.status(400).json({
                successful: false,
                message: `Schedule conflict detected: Room ${room.Code} is already booked on ${currentDay} within ${Start_time} - ${End_time} for ${Semester} semester, ${SchoolYearName}.`
            });
        }

        // Only perform professor validations if an assignation has a professor
        if (assignation.Professor) {
            const professorId = assignation.Professor.id;
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
                    message: `Professor ${assignation.Professor.Name} has no availability set for ${currentDay}.`
                });
            }

            // Check if the proposed schedule falls within any of the professor's available time slots
            const isProfessorAvailable = professorAvailabilities.some(availability => {
                const availStartSec = timeToSeconds(availability.Start_time);
                const availEndSec = timeToSeconds(availability.End_time);
                return (newStartSec >= availStartSec && newEndSec <= availEndSec);
            });

            if (!isProfessorAvailable) {
                return res.status(400).json({
                    successful: false,
                    message: `Professor ${assignation.Professor.Name} is not available during ${Start_time} - ${End_time} on ${currentDay}.`
                });
            }

            const professorSchedules = await Schedule.findAll({
                include: [{
                    model: Assignation,
                    where: { ProfessorId: professorId, Semester, SchoolYearId }
                }],
                where: {
                    Day,
                    id: { [Op.ne]: id } // Exclude current schedule
                }
            });

            let profScheduleForDay = { hours: 0, dailyTimes: [] };
            professorSchedules.forEach(s => {
                const startSec = timeToSeconds(s.Start_time);
                const endSec = timeToSeconds(s.End_time);
                const durationHours = (endSec - startSec) / 3600; // Convert seconds to hours with decimal precision
                profScheduleForDay.hours += durationHours;

                // Parse hours and minutes for more detailed time management
                const [startHour, startMin] = s.Start_time.split(':').map(Number);
                const [endHour, endMin] = s.End_time.split(':').map(Number);

                profScheduleForDay.dailyTimes.push({
                    start: startHour + (startMin / 60), // Convert to decimal hours
                    end: endHour + (endMin / 60),
                    startTime: s.Start_time,
                    endTime: s.End_time
                });
            });

            // Parse start time with minute precision
            const [startHour, startMin] = Start_time.split(':').map(Number);
            const newStartHourDecimal = startHour + (startMin / 60); // Decimal hours for more precise calculation

            const isProfessorScheduleConflict = professorSchedules.some(existing => {
                const existingStartSec = timeToSeconds(existing.Start_time);
                const existingEndSec = timeToSeconds(existing.End_time);
                return (newStartSec < existingEndSec && newEndSec > existingStartSec);
            });

            if (isProfessorScheduleConflict) {
                return res.status(400).json({
                    successful: false,
                    message: `Professor ${assignation.Professor.Name} has a scheduling conflict during ${Start_time} - ${End_time} on day ${currentDay} for ${Semester} semester, ${SchoolYearName}.`
                });
            }

            const allProfAvailability = await ProfAvail.findAll({
                where: { ProfessorId: professorId }
            });

            const professorAvailabilityCache = {};
            allProfAvailability.forEach(avail => {
                const cacheKey = `prof-${avail.ProfessorId}`;
                if (!professorAvailabilityCache[cacheKey]) {
                    professorAvailabilityCache[cacheKey] = [];
                }
                professorAvailabilityCache[cacheKey].push(avail);
            });

            const availData = professorAvailabilityCache[`prof-${professorId}`] || [];
            professorAvailabilityCache[`prof-count-${professorId}`] = availData.length;

            if (!(canScheduleProfessor(profScheduleForDay, newStartHourDecimal, currentScheduleDuration, settings, professorId, Day, professorAvailabilityCache))) {
                return res.status(400).json({
                    successful: false,
                    message: `The professor ${assignation.Professor.Name} would exceed the allowed teaching hours for ${Semester} semester, ${SchoolYearName}.`
                });
            }
        }

        // Check course duration (without considering sections)
        const existingCourseSchedules = await Schedule.findAll({
            include: [{
                model: Assignation,
                where: {
                    CourseId: assignation.Course.id,
                    Semester,
                    SchoolYearId
                }
            }],
            where: {
                id: { [Op.ne]: id } // Exclude current schedule
            }
        });

        let scheduledHours = 0;
        existingCourseSchedules.forEach(sched => {
            const schedStart = timeToSeconds(sched.Start_time);
            const schedEnd = timeToSeconds(sched.End_time);
            scheduledHours += (schedEnd - schedStart) / 3600;
        });

        if (scheduledHours + currentScheduleDuration > assignation.Course.Duration) {
            const remainingHours = assignation.Course.Duration - scheduledHours;
            return res.status(400).json({
                successful: false,
                message: `Adding ${currentScheduleDuration} hours would exceed the course duration of ${assignation.Course.Duration} hours. Remaining balance: ${remainingHours} hours.`
            });
        }

        // Update schedule details
        await schedule.update({ Day, Start_time, End_time, RoomId, AssignationId });

        // Retrieve the updated schedule with associated data
        const updatedSchedule = await Schedule.findByPk(id, {
            include: [
                { 
                    model: Assignation, 
                    include: [
                        { model: Course }, 
                        { model: Professor }
                    ] 
                },
                { model: Room }
            ]
        });

        return res.status(200).json({
            successful: true,
            message: "Schedule updated successfully.",
            schedule: updatedSchedule
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
            include: [
                { model: Room },
                { 
                    model: Assignation, 
                    include: [
                        { model: Course },
                        { model: Professor }
                    ]
                }
            ],
        });
        if (!schedule) {
            return res.status(404).json({ successful: false, message: "Schedule not found." });
        }
        return res.status(200).json({ successful: true, data: schedule });
    } catch (error) {
        return res.status(500).json({ successful: false, message: error.message || "An unexpected error occurred." });
    }
};

// Get all Schedules
const getAllSchedules = async (req, res, next) => {
    try {
        const schedules = await Schedule.findAll({
            include: [
                { model: Room },
                { 
                    model: Assignation, 
                    include: [
                        { model: Course },
                        { model: Professor }
                    ]
                }
            ],
        });
        return res.status(200).json({ successful: true, data: schedules });
    } catch (error) {
        next(error);
    }
};

const getSchedsByRoom = async (req, res, next) => {
    try {
        const { Semester } = req.body;

        const sched = await Schedule.findAll({
            where: { RoomId: req.params.id },
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    where: { Semester },
                    attributes: ['id', 'Semester', 'DepartmentId'],
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
};

const getSchedsByProf = async (req, res, next) => {
    try {
        const profId = req.params.id;
        const { Semester } = req.body;

        const scheds = await Schedule.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    // only include schedules linked to this professor
                    model: Assignation,
                    where: { ProfessorId: profId, Semester },
                    attributes: ['id', 'Semester'],
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
                            as: 'TypeRooms',
                            attributes: ['id', 'Type'],
                            through: {
                                attributes: []
                            }
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
        const { Semester } = req.body;

        const scheds = await Schedule.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    where: { DepartmentId: deptId, Semester },
                    attributes: ['id', 'Semester'],
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
                            as: 'TypeRooms',
                            attributes: ['id', 'Type'],
                            through: {
                                attributes: []
                            }
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
        return res.status(500).json({ successful: false, message: error.message || "An unexpected error occurred." });
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