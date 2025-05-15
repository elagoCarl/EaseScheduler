// Import required models and dependencies
const { Settings, Schedule, Room, Assignation, Program, Professor, Department, Course, ProfAvail, RoomType, SchoolYear, ProgYrSec } = require('../models');
const { Op } = require('sequelize');
const util = require("../../utils");






// Add this debugging function at the top level (outside any other functions)
const roomTypeDebugger = {
    courseInfo: {},
    roomTypeMatches: {},
    failureReasons: {},

    // Initialize the debugger
    init: function () {
        this.courseInfo = {};
        this.roomTypeMatches = {};
        this.failureReasons = {};
    },

    // Log course room type info
    logCourseInfo: function (courseId, courseCode, roomTypeId) {
        this.courseInfo[courseId] = {
            courseCode: courseCode,
            roomTypeId: roomTypeId
        };
    },

    // Log only essential room compatibility info
    logRoomMatch: function (courseId, roomId, roomCode, primaryTypeId, secondaryTypes,
        isPrimaryMatch, isSecondaryMatch, pass) {
        // Only log once per room per course for each pass
        const key = `${courseId}-${roomId}-${pass}`;
        if (!this.roomTypeMatches[key]) {
            if (!this.roomTypeMatches[courseId]) {
                this.roomTypeMatches[courseId] = {};
            }

            this.roomTypeMatches[courseId][roomId] = {
                roomCode,
                primaryTypeId,
                secondaryTypes,
                isPrimaryMatch,
                isSecondaryMatch,
                passes: [pass]
            };

            this.roomTypeMatches[key] = true;
        } else if (this.roomTypeMatches[courseId] &&
            this.roomTypeMatches[courseId][roomId] &&
            !this.roomTypeMatches[courseId][roomId].passes.includes(pass)) {
            // Just add the pass number if we've seen this room-course combo before
            this.roomTypeMatches[courseId][roomId].passes.push(pass);
        }
    },

    // Log only the first occurrence of each failure reason for each course-room combo
    logFailure: function (courseId, roomId, roomCode, reason, pass) {
        const key = `${courseId}-${roomId}-${reason}-${pass}`;
        if (!this.failureReasons[key]) {
            if (!this.failureReasons[courseId]) {
                this.failureReasons[courseId] = [];
            }

            this.failureReasons[courseId].push({
                roomId,
                roomCode,
                reason,
                pass
            });

            this.failureReasons[key] = true;
        }
    },

    // Generate concise report
    generateReport: function () {
        let report = "\n===== ROOM TYPE DEBUG REPORT =====\n";

        // Course info section
        report += "\nCOURSE INFORMATION:\n";
        for (const courseId in this.courseInfo) {
            const info = this.courseInfo[courseId];
            report += `Course: ${info.courseCode}, Room Type ID: ${info.roomTypeId}\n`;
        }

        // Room matches section (condensed)
        report += "\nROOM COMPATIBILITY SUMMARY:\n";
        for (const courseId in this.roomTypeMatches) {
            const info = this.courseInfo[courseId];
            if (!info) continue;

            report += `\nFor course ${info.courseCode} (Type ID: ${info.roomTypeId}):\n`;

            // Count different match types
            let primaryMatches = 0;
            let secondaryMatches = 0;
            let noMatches = 0;

            // List rooms by compatibility
            const primaryRooms = [];
            const secondaryRooms = [];
            const noMatchRooms = [];

            for (const roomId in this.roomTypeMatches[courseId]) {
                const match = this.roomTypeMatches[courseId][roomId];
                if (match.isPrimaryMatch) {
                    primaryMatches++;
                    primaryRooms.push(match.roomCode);
                } else if (match.isSecondaryMatch) {
                    secondaryMatches++;
                    secondaryRooms.push(match.roomCode);
                } else {
                    noMatches++;
                    noMatchRooms.push(match.roomCode);
                }
            }

            report += `  Primary matches: ${primaryMatches} rooms (${primaryRooms.join(', ')})\n`;
            report += `  Secondary matches: ${secondaryMatches} rooms (${secondaryRooms.join(', ')})\n`;
            report += `  No matches: ${noMatches} rooms\n`;

            // Indicate which passes each room was tried in
            report += `  First pass rooms: ${Object.values(this.roomTypeMatches[courseId])
                .filter(r => r.passes.includes(1))
                .map(r => r.roomCode)
                .join(', ') || 'None'}\n`;

            report += `  Second pass rooms: ${Object.values(this.roomTypeMatches[courseId])
                .filter(r => r.passes.includes(2))
                .map(r => r.roomCode)
                .join(', ') || 'None'}\n`;
        }

        // Failure reasons section (condensed)
        report += "\nFAILURE REASONS SUMMARY:\n";
        for (const courseId in this.failureReasons) {
            const info = this.courseInfo[courseId];
            if (!info) continue;

            report += `\nFor course ${info.courseCode} (Type ID: ${info.roomTypeId}):\n`;

            // Group and count by reason and pass
            const reasonCounts = {};
            this.failureReasons[courseId].forEach(failure => {
                const key = `${failure.reason} (${failure.pass === 1 ? 'first' : 'second'} pass)`;
                reasonCounts[key] = (reasonCounts[key] || 0) + 1;
            });

            // Print counts only
            for (const reason in reasonCounts) {
                report += `  ${reason}: ${reasonCounts[reason]} times\n`;
            }
        }

        report += "\n===== END REPORT =====\n";
        return report;
    }
};






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
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return res.status(400).json({
            successful: false,
            message: "Invalid time format. Please use HH:mm in 24-hour format."
        });
    }
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

function convertDayNumberToName(dayNumber) {
    const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNumber] || "";
}

// Track scheduling failures for debugging
const schedulingLog = {
    failureReasons: {},
    successCount: 0,
    failureCount: 0,
    roomTypeFailures: 0,
    roomAvailFailures: 0,
    profAvailFailures: 0,
    initReport: function () {
        this.failureReasons = {};
        this.successCount = 0;
        this.failureCount = 0;
        this.roomTypeFailures = 0;
        this.roomAvailFailures = 0;
        this.profAvailFailures = 0;
    },
    logSuccess: function (course) {
        this.successCount++;
    },
    logFailure: function (course, reason) {
        this.failureCount++;
        if (!this.failureReasons[course]) {
            this.failureReasons[course] = {};
        }
        this.failureReasons[course][reason] = (this.failureReasons[course][reason] || 0) + 1;

        // Track specific failure types
        if (reason.includes('room type')) this.roomTypeFailures++;
        if (reason.includes('not available')) this.roomAvailFailures++;
        if (reason.includes('professor')) this.profAvailFailures++;
    },
    getReport: function () {
        let report = `\n==== SCHEDULING REPORT ====`;
        report += `\nTotal successes: ${this.successCount}`;
        report += `\nTotal failures: ${this.failureCount}`;
        report += `\nFailure breakdown: Room Type=${this.roomTypeFailures}, Room Availability=${this.roomAvailFailures}, Professor=${this.profAvailFailures}`;

        report += `\n\nPer-course failure details:`;
        for (const course in this.failureReasons) {
            report += `\n${course}:`;
            for (const reason in this.failureReasons[course]) {
                report += `\n  - ${reason}: ${this.failureReasons[course][reason]} times`;
            }
        }

        return report;
    }
};

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
    professorAvailabilityCache,
    onlyCheckPrimaryType,
    courseCode // Added for logging
) => {
    // Check if room is available
    if (!isRoomAvailable(roomSchedules, roomId, day, startHour, duration)) {
        schedulingLog.logFailure(courseCode, "room not available");
        roomTypeDebugger.logFailure(courseId, roomId, roomCache[roomId].Code, "room not available", onlyCheckPrimaryType ? 1 : 2);
        return false;
    }

    // Verify room has the required room type for this course
    const room = roomCache[roomId];
    const courseData = await Course.findByPk(courseId, {
        include: [{ model: RoomType }]
    });

    // DEBUG: Log course room type info (only once per course)
    if (!roomTypeDebugger.courseInfo[courseId] && courseData) {
        roomTypeDebugger.logCourseInfo(courseId, courseCode, courseData.RoomTypeId);
    }

    // Check room type compatibility
    if (courseData?.RoomTypeId) {
        const hasPrimaryTypeMatch = room.PrimaryTypeId === courseData.RoomTypeId;

        // Check secondary types if allowed
        const hasMatchingTypeInArray = !hasPrimaryTypeMatch && !onlyCheckPrimaryType &&
            room.RoomTypeIds && room.RoomTypeIds.includes(courseData.RoomTypeId);

        // DEBUG: Log room compatibility check
        roomTypeDebugger.logRoomMatch(
            courseId,
            roomId,
            room.Code,
            room.PrimaryTypeId,
            room.RoomTypeIds,
            hasPrimaryTypeMatch,
            hasMatchingTypeInArray,
            onlyCheckPrimaryType ? 1 : 2
        );

        // If we're only checking primary type and there's no match, return false
        if (onlyCheckPrimaryType && !hasPrimaryTypeMatch) {
            schedulingLog.logFailure(courseCode, "no primary room type match");
            roomTypeDebugger.logFailure(courseId, roomId, room.Code, "no primary room type match", 1);
            return false;
        }

        if (!hasPrimaryTypeMatch && !hasMatchingTypeInArray) {
            schedulingLog.logFailure(courseCode, "room type not compatible");
            roomTypeDebugger.logFailure(courseId, roomId, room.Code, "room type not compatible", onlyCheckPrimaryType ? 1 : 2);
            return false;
        }
    }

    // Check professor availability
    if (professorId && !canScheduleProfessor(
        professorSchedule[professorId][day],
        startHour, duration, settings, professorId, day,
        professorAvailabilityCache
    )) {
        schedulingLog.logFailure(courseCode, "professor not available");
        roomTypeDebugger.logFailure(courseId, roomId, room.Code, "professor not available", onlyCheckPrimaryType ? 1 : 2);
        return false;
    }

    return true;
};

const isRoomAvailable = (roomSchedules, roomId, day, startHour, duration) => {
    if (!roomSchedules[roomId] || !roomSchedules[roomId][day]) return true;

    // Convert input to seconds for precision comparison
    const startTimeSeconds = typeof startHour === 'number' ? startHour * 3600 : timeToSeconds(startHour);
    const endTimeSeconds = typeof startHour === 'number' ? (startHour + duration) * 3600 :
        timeToSeconds(startHour) + (duration * 3600);

    // Check for conflicts
    const conflicts = roomSchedules[roomId][day].filter(time => {
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

    return conflicts.length === 0;
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
        return true; // If no cached data, assume available
    }

    // If the professor has availability records but none for this day, they're unavailable
    const anyAvailRecords = professorAvailabilityCache[`prof-count-${professorId}`];
    if (anyAvailRecords > 0 && profAvails.length === 0) {
        return false;
    } else if (profAvails.length > 0) {
        // Check if the proposed time falls within any availability window
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
    if (profSchedule.hours + duration > settings.ProfessorMaxHours) {
        return false;
    }

    // Check for overlapping schedules
    const hasOverlap = profSchedule.dailyTimes.some(time => {
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

    if (hasOverlap) return false;

    // If no schedules yet, only check if this single class exceeds max continuous hours
    if (profSchedule.dailyTimes.length === 0) {
        return durationSeconds <= maxContinuousSeconds;
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

// Check if a course can find a primary type match in any room
const hasPrimaryTypeMatch = async (courseId, roomCache, rooms) => {
    try {
        // Get course data
        const courseData = await Course.findByPk(courseId, {
            include: [{ model: RoomType }]
        });

        if (!courseData?.RoomTypeId) {
            return true; // No room type required, so always return true
        }

        // Check if any available room has this course's type as its primary type
        const matchingRooms = rooms.filter(room => room.PrimaryTypeId === courseData.RoomTypeId);

        // Only log when there's no match (potential problem case)
        if (matchingRooms.length === 0) {
            console.log(`WARNING: No primary type match for ${courseData.Code} (Type: ${courseData.RoomTypeId})`);
        }

        return matchingRooms.length > 0;
    } catch (error) {
        console.error(`Error in hasPrimaryTypeMatch for course ${courseId}:`, error);
        return false;
    }
};

// Optimized schedule assignation function with focused error reporting
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
    professorAvailabilityCache,
    postponedAssignations = [],
    isSecondPass = false,
    maxFailAllowed = 2
) => {
    // Base case: all assignations handled
    if (index === assignations.length) {
        // If this is the first pass and we have postponed assignations, process them now
        if (!isSecondPass && postponedAssignations.length > 0) {
            console.log(`First pass complete. Starting second pass with ${postponedAssignations.length} postponed assignations.`);
            return scheduleAssignation(
                postponedAssignations,
                rooms,
                professorSchedule,
                courseSchedules,
                roomSchedules,
                0,
                report,
                startHour,
                endHour,
                settings,
                priorities,
                failedAssignations,
                roomId,
                seed,
                roomCache,
                professorAvailabilityCache,
                [],
                true,
                maxFailAllowed
            );
        }

        // Print summary report
        console.log(schedulingLog.getReport());

        // Otherwise we're done
        return true;
    }

    // Initialize scheduling log if first assignation
    if (index === 0 && !isSecondPass) {
        schedulingLog.initReport();
    }

    const assignation = assignations[index];
    const { Course: courseParam, Professor: professorInfo } = assignation;
    const duration = courseParam.Duration;

    try {
        // In first pass, check if this course should be postponed
        if (!isSecondPass && courseParam.RoomTypeId) {
            // Check if this course has any room with primary type match
            const hasPrimary = await hasPrimaryTypeMatch(courseParam.id, roomCache, rooms);

            if (!hasPrimary) {
                console.log(`POSTPONING TO SECOND PASS: ${courseParam.Code} (Type: ${courseParam.RoomTypeId}) - No primary type match`);
                postponedAssignations.push(assignation);

                // Skip to next assignation
                return scheduleAssignation(
                    assignations, rooms, professorSchedule, courseSchedules,
                    roomSchedules, index + 1,
                    report, startHour, endHour, settings, priorities,
                    failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
                    postponedAssignations, isSecondPass, maxFailAllowed
                );
            }
        }

        // Build the candidate room list based on the current pass
        const prioritizedByUserList = priorities?.room
            ? rooms.filter(r => priorities.room.includes(r.id))
            : [];

        let roomsToTry = [];

        if (!isSecondPass) {
            // FIRST PASS: Only use rooms with primary type match
            const requiredTypeId = courseParam.RoomTypeId;
            const primaryTypeMatchList = requiredTypeId
                ? rooms.filter(r => r.PrimaryTypeId === requiredTypeId &&
                    (!priorities?.room || !priorities.room.includes(r.id)))
                : rooms.filter(r => !priorities?.room || !priorities.room.includes(r.id));

            // First pass only uses primary match rooms (plus user priorities)
            roomsToTry = [...prioritizedByUserList, ...primaryTypeMatchList];
        } else {
            // SECOND PASS: Try any room with compatible type (primary or secondary)
            const requiredTypeId = courseParam.RoomTypeId;

            const primaryTypeMatchList = requiredTypeId
                ? rooms.filter(r => r.PrimaryTypeId === requiredTypeId &&
                    (!priorities?.room || !priorities.room.includes(r.id)))
                : [];

            const secondaryTypeMatchList = requiredTypeId
                ? rooms.filter(r => r.PrimaryTypeId !== requiredTypeId &&
                    r.TypeRooms?.some(type => type.id === requiredTypeId) &&
                    (!priorities?.room || !priorities.room.includes(r.id)))
                : [];

            // In second pass, we use both primary and secondary match rooms
            roomsToTry = [...prioritizedByUserList, ...primaryTypeMatchList, ...secondaryTypeMatchList];

            // If no RoomTypeId is specified, include all rooms
            if (!requiredTypeId) {
                const otherRooms = rooms.filter(r =>
                    (!priorities?.room || !priorities.room.includes(r.id)) &&
                    !primaryTypeMatchList.some(pm => pm.id === r.id) &&
                    !secondaryTypeMatchList.some(sm => sm.id === r.id)
                );
                roomsToTry = [...roomsToTry, ...otherRooms];
            }
        }

        // Create a deep copy of the current state for backtracking
        const saveState = () => {
            return {
                professorSchedule: JSON.parse(JSON.stringify(professorSchedule)),
                courseSchedules: JSON.parse(JSON.stringify(courseSchedules)),
                roomSchedules: JSON.parse(JSON.stringify(roomSchedules)),
                report: [...report]
            };
        };

        // Restore state when backtracking
        const restoreState = (state) => {
            // Copy all properties back to the original objects
            Object.keys(state.professorSchedule).forEach(profId => {
                if (professorSchedule[profId]) {
                    Object.keys(state.professorSchedule[profId]).forEach(day => {
                        professorSchedule[profId][day] = state.professorSchedule[profId][day];
                    });
                }
            });

            Object.keys(state.courseSchedules).forEach(courseId => {
                if (courseSchedules[courseId]) {
                    Object.keys(state.courseSchedules[courseId]).forEach(day => {
                        courseSchedules[courseId][day] = state.courseSchedules[courseId][day];
                    });
                }
            });

            Object.keys(state.roomSchedules).forEach(roomId => {
                roomSchedules[roomId] = state.roomSchedules[roomId];
            });

            // Truncate report to match the saved state
            report.length = 0;
            report.push(...state.report);
        };

        // Get day orderings based on seed
        const allDays = [1, 2, 3, 4, 5, 6];

        // Create multiple day orderings to try if initial attempts fail
        const dayOrderingVariations = [
            [...allDays], // Standard order
            [3, 2, 4, 1, 5, 6], // Alternative order
            [2, 4, 1, 3, 5, 6], // Another alternative
            [1, 3, 5, 2, 4, 6]  // Yet another alternative
        ];

        // Start with the seed-based ordering
        let dayOrderingIndex = seed % dayOrderingVariations.length;
        let dayOrdering = dayOrderingVariations[dayOrderingIndex];

        // MODIFIED: Apply variant-specific room ordering based on dynamic priority
        let categoryRooms = [...roomsToTry];

        // IMPORTANT: Remove the hard-coded "lec" type sorting
        // Instead, use a dynamic room type priority system from settings
        if (settings.roomTypePriorities && settings.roomTypePriorities.length > 0) {
            categoryRooms.sort((a, b) => {
                const aPrimaryId = a.PrimaryTypeId;
                const bPrimaryId = b.PrimaryTypeId;

                // Use the priority index to sort (lower index = higher priority)
                const aPriority = settings.roomTypePriorities.indexOf(aPrimaryId);
                const bPriority = settings.roomTypePriorities.indexOf(bPrimaryId);

                // If both room types are in the priority list, sort by priority
                if (aPriority !== -1 && bPriority !== -1) {
                    return aPriority - bPriority;
                }

                // If only one is in the priority list, prioritize it
                if (aPriority !== -1) return -1;
                if (bPriority !== -1) return 1;

                // Otherwise, don't change the order
                return 0;
            });
        }

        // Keep track of how many consecutive failures we've had
        let consecutiveFailures = 0;
        let savedOriginalState = null;

        // Add outer loop to try different day orderings if needed
        for (let attempt = 0; attempt < dayOrderingVariations.length; attempt++) {
            // Only switch day orderings after the first attempt
            if (attempt > 0) {
                dayOrderingIndex = (dayOrderingIndex + 1) % dayOrderingVariations.length;
                dayOrdering = dayOrderingVariations[dayOrderingIndex];

                // Restore to original state before this assignation
                if (savedOriginalState) {
                    restoreState(savedOriginalState);
                }
            }

            // Try each room in the category
            for (const room of categoryRooms) {
                // Save state for potential backtracking (only on first room of first attempt)
                if (attempt === 0 && room === categoryRooms[0]) {
                    savedOriginalState = saveState();
                }

                // Save the current state before trying this room
                const roomOriginalState = saveState();

                // Try each day
                for (const day of dayOrdering) {
                    // Get different hour orderings based on seed and attempt
                    let hourOptions = [];
                    for (let h = startHour; h + duration <= endHour; h++) {
                        hourOptions.push(h);
                    }

                    // Create multiple hour ordering variations to try
                    const hourOrderingVariations = [
                        [...hourOptions], // Original order
                        [...hourOptions].reverse(), // Reverse order
                        // Mixed order - start from middle
                        (() => {
                            const mid = Math.floor(hourOptions.length / 2);
                            return [...hourOptions.slice(mid), ...hourOptions.slice(0, mid)];
                        })(),
                        // Another mixed order
                        (() => {
                            const result = [];
                            for (let i = 0; i < hourOptions.length; i++) {
                                if (i % 2 === 0) {
                                    result.push(hourOptions[i]);
                                } else {
                                    result.unshift(hourOptions[i]);
                                }
                            }
                            return result;
                        })()
                    ];

                    // Choose hour ordering based on seed and attempt
                    const hourOrderIndex = (seed + attempt) % hourOrderingVariations.length;
                    const finalHourOptions = hourOrderingVariations[hourOrderIndex];

                    // Try each hour
                    for (let hour of finalHourOptions) {
                        // Pass onlyCheckPrimaryType flag based on the current pass
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
                            professorAvailabilityCache,
                            !isSecondPass, // In first pass, only check primary type
                            courseParam.Code // Pass the course code for logging
                        );

                        if (isPossible) {
                            // Log success
                            schedulingLog.logSuccess(courseParam.Code);

                            // Update trackers
                            if (professorInfo) {
                                professorSchedule[professorInfo.id][day].hours += duration;
                                professorSchedule[professorInfo.id][day].dailyTimes.push({
                                    start: hour,
                                    end: hour + duration
                                });
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
                                AssignationId: assignation.id,
                                roomTypeCategory: isSecondPass ? "secondPass" : "firstPass",
                                hasPrimaryTypeMatch: room.PrimaryTypeId === courseParam.RoomTypeId,
                                attempt: attempt
                            });

                            // Reset consecutive failures counter since we found a viable slot
                            consecutiveFailures = 0;

                            // Try to schedule the next assignation
                            const nextSuccess = await scheduleAssignation(
                                assignations, rooms, professorSchedule, courseSchedules,
                                roomSchedules, index + 1,
                                report, startHour, endHour, settings, priorities,
                                failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
                                postponedAssignations, isSecondPass, maxFailAllowed
                            );

                            if (nextSuccess) {
                                // We've found a complete solution
                                return true;
                            } else {
                                // This path leads to a dead end, backtrack
                                consecutiveFailures++;

                                // If we've had too many consecutive failures, try a different approach
                                if (consecutiveFailures >= maxFailAllowed) {
                                    break; // Break out of hour loop to try different day ordering
                                }

                                // Restore state to before we tried this room
                                restoreState(roomOriginalState);
                            }
                        }
                    }

                    // If we've had too many consecutive failures, break out of day loop too
                    if (consecutiveFailures >= maxFailAllowed) {
                        break;
                    }
                }

                // If we've had too many consecutive failures, break out of room loop too
                if (consecutiveFailures >= maxFailAllowed) {
                    break;
                }
            }

            // If we've already tried all day orderings or found a solution, no need to continue
            if (attempt === dayOrderingVariations.length - 1 || consecutiveFailures < maxFailAllowed) {
                break;
            }

            // Reset consecutive failures counter before trying a new day ordering
            consecutiveFailures = 0;
        }

        // If we get here, we've tried all room options and couldn't schedule this assignation
        console.log(`Failed to schedule ${courseParam.Code} in ${isSecondPass ? 'second' : 'first'} pass`);

        // If we get here, we've tried all room options and couldn't schedule this assignation
        console.log(`Failed to schedule ${courseParam.Code} in ${isSecondPass ? 'second' : 'first'} pass`);

        // If this is the first pass, always postpone to the second pass to try secondary types
        if (!isSecondPass) {
            console.log(`POSTPONING: ${courseParam.Code} to second pass due to scheduling failure`);
            postponedAssignations.push(assignation);
        } else {
            // Only add to failedAssignations if we're in the second pass
            failedAssignations.push({
                id: assignation.id,
                Course: courseParam.Code,
                Professor: professorInfo?.Name,
                reason: `Could not find suitable time slot in any compatible room (second pass)`
            });
        }

        // Move on to next assignation regardless
        return scheduleAssignation(
            assignations, rooms, professorSchedule, courseSchedules,
            roomSchedules, index + 1,
            report, startHour, endHour, settings, priorities,
            failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
            postponedAssignations, isSecondPass, maxFailAllowed
        );

    } catch (err) {
        console.error(`Error scheduling ${courseParam.Code}:`, err);
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
            failedAssignations, roomId, seed, roomCache, professorAvailabilityCache,
            postponedAssignations, isSecondPass, maxFailAllowed
        );
    }
};

const generateScheduleVariants = async (req, res, next) => {
    try {
        roomTypeDebugger.init();
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

        console.log(`Fetching settings for DepartmentId=${DepartmentId}`)
        // 2) Load settings

        const settings = await Settings.findOne({ where: 1 });
        if (!settings) {
            console.log(`Warning: No settings found. Using defaults.`);
        }
        const { StartHour, EndHour } = settings;

        // Default to empty array if not defined in settings
        if (!settings.roomTypePriorities) {
            settings.roomTypePriorities = [];
        }

        // Create caches for better performance
        const roomCache = {};
        const professorAvailabilityCache = {};

        // 3) Fetch department data
        console.log("Fetching department data...");

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
                            attributes: ['id', 'Code', 'Description', 'Duration', 'Type', 'RoomTypeId', 'PairId'],
                            include: [{ model: RoomType }] // Make sure to include the RoomType for each course
                        },
                        { model: Professor, attributes: ['id', 'Name'] }
                    ]
                },
                {
                    model: Room,
                    as: 'DeptRooms',
                    include: [
                        {
                            model: RoomType,
                            as: 'TypeRooms',
                            through: { attributes: [] }
                        },
                        {
                            model: RoomType,
                            as: 'RoomType',
                            foreignKey: 'PrimaryTypeId'
                        }
                    ]
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

        // ============== DETAILED ROOM LOGGING START ==============
        console.log("\n============= DETAILED ROOM INFORMATION =============");
        console.log(`Total rooms available: ${rooms.length}`);

        // Create a mapping of room type IDs to names
        const roomTypeNames = {};
        rooms.forEach(room => {
            if (room.RoomType && room.RoomType.id) {
                roomTypeNames[room.RoomType.id] = room.RoomType.Type;
            }

            if (room.TypeRooms) {
                room.TypeRooms.forEach(type => {
                    if (type.id) {
                        roomTypeNames[type.id] = type.Type;
                    }
                });
            }
        });

        // Log room type mapping
        console.log("\nRoom Type Mapping:");
        for (const [typeId, typeName] of Object.entries(roomTypeNames)) {
            console.log(`  Type ID ${typeId}: ${typeName}`);
        }

        // Log detailed information for each room
        console.log("\nDetailed Room Information:");
        rooms.forEach((room, index) => {
            console.log(`\nRoom ${index + 1}:`);
            console.log(`  ID: ${room.id}`);
            console.log(`  Code: ${room.Code}`);
            console.log(`  Primary Type ID: ${room.PrimaryTypeId}`);
            console.log(`  Primary Type Name: ${room.RoomType ? room.RoomType.Type : 'N/A'}`);

            console.log(`  Secondary Types: ${room.TypeRooms && room.TypeRooms.length > 0 ?
                room.TypeRooms.map(type => `${type.id} (${type.Type})`).join(', ') : 'None'}`);
        });

        // Log course room type requirements
        console.log("\nCourse Room Type Requirements:");
        const coursesByRoomType = {};
        assignations.forEach(a => {
            if (a.Course && a.Course.RoomTypeId) {
                if (!coursesByRoomType[a.Course.RoomTypeId]) {
                    coursesByRoomType[a.Course.RoomTypeId] = [];
                }
                coursesByRoomType[a.Course.RoomTypeId].push(a.Course.Code);
            } else if (a.Course) {
                if (!coursesByRoomType['no_requirement']) {
                    coursesByRoomType['no_requirement'] = [];
                }
                coursesByRoomType['no_requirement'].push(a.Course.Code);
            }
        });

        for (const [typeId, courses] of Object.entries(coursesByRoomType)) {
            const typeName = typeId === 'no_requirement' ? 'No specific requirement' :
                `Type ${typeId} (${roomTypeNames[typeId] || 'Unknown'})`;
            console.log(`  ${typeName}: ${courses.join(', ')}`);
        }

        // Check room compatibility for each course
        console.log("\nRoom Compatibility Analysis:");
        assignations.forEach(a => {
            if (!a.Course) return;

            const courseRoomTypeId = a.Course.RoomTypeId;
            const courseName = a.Course.Code;

            console.log(`\n  Course: ${courseName}`);
            console.log(`  Required Room Type: ${courseRoomTypeId ?
                `${courseRoomTypeId} (${roomTypeNames[courseRoomTypeId] || 'Unknown'})` : 'Any'}`);

            if (courseRoomTypeId) {
                // Find primary matching rooms
                const primaryMatches = rooms.filter(r => r.PrimaryTypeId === courseRoomTypeId);
                console.log(`  Primary Type Matching Rooms: ${primaryMatches.length}`);
                primaryMatches.forEach(r => console.log(`    - Room ${r.Code} (ID: ${r.id})`));

                // Find secondary matching rooms
                const secondaryMatches = rooms.filter(r =>
                    r.PrimaryTypeId !== courseRoomTypeId &&
                    r.TypeRooms && r.TypeRooms.some(t => t.id === courseRoomTypeId)
                );
                console.log(`  Secondary Type Matching Rooms: ${secondaryMatches.length}`);
                secondaryMatches.forEach(r => console.log(`    - Room ${r.Code} (ID: ${r.id})`));

                console.log(`  Total Compatible Rooms: ${primaryMatches.length + secondaryMatches.length}`);
            } else {
                console.log(`  All Rooms Compatible: ${rooms.length}`);
            }
        });
        console.log("\n============= END ROOM INFORMATION =============\n");
        // ============== DETAILED ROOM LOGGING END ==============

        // Log room type summary for debugging
        console.log(`Room type mapping summary:`);
        const roomTypeCounts = {};
        rooms.forEach(room => {
            if (!roomTypeCounts[room.PrimaryTypeId]) {
                roomTypeCounts[room.PrimaryTypeId] = 0;
            }
            roomTypeCounts[room.PrimaryTypeId]++;
        });
        for (const [typeId, count] of Object.entries(roomTypeCounts)) {
            console.log(`  Room type ${typeId}: ${count} rooms`);
        }

        // Cache all rooms data
        rooms.forEach(room => {
            roomCache[room.id] = {
                id: room.id,
                Code: room.Code,
                RoomTypeIds: room.TypeRooms ? room.TypeRooms.map(rt => rt.id) : [],
                PrimaryTypeId: room.PrimaryTypeId,
                PrimaryTypeName: room.RoomType ? room.RoomType.Type : null
            };
        });

        console.log("\n=== ROOM CACHE ===");
        for (const roomId in roomCache) {
            const room = roomCache[roomId];
            console.log(`Room ${room.Code}: Primary=${room.PrimaryTypeId}, Secondary=[${room.RoomTypeIds.join(',')}]`);
        }
        console.log("=== END ROOM CACHE ===\n");

        // 4) Get existing locked schedules for this department
        const assignationIds = assignations.map(a => a.id);

        // Eager load all locked schedules with related data
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

        // 5) Get ALL existing schedules for ANY room that might be used in one query
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

        console.log(`Found ${allRoomSchedules.length} existing schedules across all rooms`);

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

        // Helper function for deterministic shuffling based on seed
        function shuffleDeterministic(array, seed) {
            const newArray = [...array];
            // Simple deterministic shuffle algorithm based on seed
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor((i * seed) % (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        }

        // MODIFIED: Remove the hard-coded room sorting based on "lec" type
        // Instead, use the dynamic room type priority list from settings
        if (settings.roomTypePriorities && settings.roomTypePriorities.length > 0) {
            rooms.sort((a, b) => {
                const aPrimaryId = a.PrimaryTypeId;
                const bPrimaryId = b.PrimaryTypeId;

                // Use the priority index to sort (lower index = higher priority)
                const aPriority = settings.roomTypePriorities.indexOf(aPrimaryId);
                const bPriority = settings.roomTypePriorities.indexOf(bPrimaryId);

                // If both room types are in the priority list, sort by priority
                if (aPriority !== -1 && bPriority !== -1) {
                    return aPriority - bPriority;
                }

                // If only one is in the priority list, prioritize it
                if (aPriority !== -1) return -1;
                if (bPriority !== -1) return 1;

                // Otherwise, don't change the order
                return 0;
            });
        }

        // Array to store our variants
        const scheduleVariants = [];

        // Generate multiple schedule variants
        for (let variant = 0; variant < variantCount; variant++) {
            console.log(`\nGenerating variant ${variant + 1} of ${variantCount}`);

            // ============== VARIANT ROOM LOGGING START ==============
            console.log(`\n--- ROOMS FOR VARIANT ${variant + 1} ---`);

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

                console.log(`Priority rooms: ${prioritizedRooms.map(r => r.Code).join(', ')}`);
                console.log(`Non-priority rooms (shuffled): ${shuffledNonPriorityRooms.map(r => r.Code).join(', ')}`);
            } else if (variant > 0) {
                // If no room priorities, shuffle everything
                variantRooms = shuffleDeterministic([...rooms], variant);
                console.log(`All rooms (shuffled): ${variantRooms.map(r => r.Code).join(', ')}`);
            } else {
                console.log(`All rooms (original order): ${variantRooms.map(r => r.Code).join(', ')}`);
            }

            // MODIFIED: Log room ordering without "lec" type sorting mention
            if (variant === 0) {
                console.log(`\nRoom order after priority sorting:`);
                variantRooms.forEach((r, i) => {
                    console.log(`  ${i + 1}. Room ${r.Code} (ID: ${r.id}), Primary Type: ${r.PrimaryTypeId}, Secondary Types: ${r.TypeRooms && r.TypeRooms.length > 0 ?
                            r.TypeRooms.map(t => t.id).join(', ') : 'None'
                        }`);
                });
            }
            // ============== VARIANT ROOM LOGGING END ==============

            // Initialize tracking structures
            const professorSchedule = {}, courseSchedules = {}, roomSchedules = {};

            // Initialize structures for this variant
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

            // Initialize roomSchedules with ALL existing schedules from all departments
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

            // For each variant, preserve priority ordering but apply variation to non-priority items
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

                // ===== Log the variant assignation order =====
                console.log(`\nVariant ${variant + 1} Assignation Order:`);
                variantAssignations.forEach((a, i) => {
                    console.log(`  ${i + 1}. ${a.Course.Code} (PairId: ${a.Course.PairId || 'None'}, RoomTypeId: ${a.Course.RoomTypeId || 'None'})`);
                });
            }

            rooms = variantRooms;

            // Run scheduler with this variant's configuration
            const report = [], failedAssignations = [];
            const variantSeed = variant + 1; // Use variant number as seed
            const postponedAssignations = []; // Array to store postponed assignations

            // Run the modified scheduling algorithm with two-pass approach
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
                professorAvailabilityCache,
                postponedAssignations, // Pass the array to store postponed assignations
                false                 // Start with first pass
            );

            console.log(`Variant ${variant + 1} results: ${report.length} scheduled, ${failedAssignations.length} failed`);

            // After running the scheduler in the variant loop, add this logging
            console.log("\n=== VARIANT FAILURE SUMMARY ===");
            for (const failure of failedAssignations) {
                console.log(`Failed: ${failure.Course} - Reason: ${failure.reason}`);
            }
            console.log("=== END VARIANT FAILURE SUMMARY ===\n");

            // Store both locked schedules and newly generated ones for this variant
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

        // Print our detailed room type debug report
        console.log(roomTypeDebugger.generateReport());

        // Form response with execution time
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
        const { Semester, SchoolYearId } = req.body;

        const sched = await Schedule.findAll({
            where: { RoomId: req.params.id },
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    where: { 
                        Semester,
                        SchoolYearId // Add SchoolYearId to filter schedules
                    },
                    attributes: ['id', 'Semester', 'DepartmentId', 'SchoolYearId'],
                    include: [
                        {
                            model: Course,
                            attributes: ['Code', 'Description']
                        },
                        {
                            model: Professor,
                            attributes: ['Name']
                        },
                        {
                            // Add ProgYrSec to include section data
                            model: ProgYrSec,
                            attributes: ['id', 'Year', 'Section'],
                            include: [
                                {
                                    model: Program,
                                    attributes: ['id', 'Code', 'Name']
                                }
                            ]
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
        const { Semester, SchoolYearId } = req.body;

        const scheds = await Schedule.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    // only include schedules linked to this professor
                    model: Assignation,
                    where: { 
                        ProfessorId: profId, 
                        Semester,
                        SchoolYearId // Add SchoolYearId to the where clause
                    },
                    attributes: ['id', 'Semester'],
                    include: [
                        {
                            model: Course,
                            attributes: ['Code', 'Description']
                        },
                        {
                            // Add this to include the ProgYrSec data
                            model: ProgYrSec,
                            attributes: ['id', 'Year', 'Section'],
                            include: [
                                {
                                    model: Program,
                                    attributes: ['Code', 'Name']
                                }
                            ]
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
        const { Semester, SchoolYearId } = req.body;

        // First, get all assignations for the given department, semester, and school year
        const assignations = await Assignation.findAll({
            where: {
                DepartmentId: deptId,
                Semester,
                SchoolYearId
            },
            include: [
                {
                    model: ProgYrSec,
                    include: [{ model: Program }]
                }
            ]
        });

        // Get the assignation IDs
        const assignationIds = assignations.map(a => a.id);

        const scheds = await Schedule.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: Assignation,
                    where: { id: assignationIds },
                    attributes: ['id', 'Semester', 'SchoolYearId'],
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
                            model: ProgYrSec,
                            attributes: ['id', 'Year', 'Section'],
                            include: [
                                {
                                    model: Program,
                                    attributes: ['id', 'Code', 'Name']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Room,
                    attributes: ['Code', 'Floor', 'Building'],
                    include: [
                        {
                            model: RoomType,
                            as: 'TypeRooms',
                            attributes: ['id', 'Type'],
                            through: { attributes: [] }
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

        // Add ProgYrSecs to each schedule
        const schedsWithSections = scheds.map(sched => {
            const schedData = sched.toJSON();
            if (schedData.Assignation) {
                // If Assignation already has ProgYrSecs, keep them
                // This should be the case with the proper includes above
            }
            return schedData;
        });

        res.status(200).json({
            successful: true,
            message: 'Retrieved all schedules',
            count: schedsWithSections.length,
            data: schedsWithSections
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