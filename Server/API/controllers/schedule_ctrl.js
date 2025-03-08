const { Settings, Schedule, Room, Assignation, Professor, Course, CourseProg, ProgYrSec, SectionSched, Department } = require('../models');
const { Op } = require('sequelize');
const util = require("../../utils");
const { json } = require('body-parser');

// Constraint variables
const professorMaxLimit = 12; // Max hours a professor can stay at school per day
const professorInterval = { shortBreak: 0.5, longBreak: 1, maxHours: 6 }; // Break intervals for professors
const studentInterval = { shortBreak: 0.5, longBreak: 1, maxHours: 6 }; // Break intervals for students per section



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

const backtrackSchedule = async ( assignations, rooms, professorSchedule, courseSchedules, index, report, startHour, endHour ) => {
    // Base case: if all assignations are scheduled, return true.
    if (index === assignations.length) return true;
  
    // Get the current assignation (should include Course and Professor)
    const assignation = assignations[index];
    const { Course, Professor } = assignation;
    const duration = Course.Duration;
  
    // -------------------------------------------------------------------
    // 1) Determine the valid ProgYrSec rows for this course
    // -------------------------------------------------------------------
    let validProgYrSecs = [];
    if (Course.Type === "Core") {
      // For Core courses, we only require matching Year.
      validProgYrSecs = await ProgYrSec.findAll({
        where: {
          Year: Course.Year
        }
      });
      if (!validProgYrSecs || validProgYrSecs.length === 0) {
        console.log(
          `No matching sections for Core course ${Course.Code} with Year=${Course.Year}`
        );
        return false;
      }
    } else if (Course.Type === "Professional") {
      // For Professional courses, also enforce allowed Programs from CourseProg.
      
      const courseProgs = await CourseProg.findAll({
        where: { CourseId: Course.id }
      });
      if (!courseProgs || courseProgs.length === 0) {
        console.log(courseProgs);
        console.log(
          `No CourseProg entries for Professional course ${Course.Code}. Cannot schedule.`
        );
        return false;
      }
      const allowedProgramIds = courseProgs.map(cp => cp.ProgramId);
  
      validProgYrSecs = await ProgYrSec.findAll({
        where: {
          Year: Course.Year,
          ProgramId: { [Op.in]: allowedProgramIds }
        }
      });
      if (!validProgYrSecs || validProgYrSecs.length === 0) {
        console.log(
          `No matching sections (ProgYrSec) for Professional course ${Course.Code} with Year=${Course.Year} in allowed programs [${allowedProgramIds}].`
        );
        return false;
      }
    } else {
      console.log(`Unknown course type: ${Course.Type}`);
      return false;
    }
  
    // -------------------------------------------------------------------
    // 2) Group the valid ProgYrSec rows by ProgramId and Year.
    //     This way, sections belonging to the same program & year can be combined.
    // -------------------------------------------------------------------
    const groups = {};
    validProgYrSecs.forEach(section => {
      const key = `${section.ProgramId}-${section.Year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(section);
    });
  
    // -------------------------------------------------------------------
    // 3) Iterate over each group to attempt scheduling.
    // -------------------------------------------------------------------
    for (const groupKey in groups) {
      const group = groups[groupKey];
      const totalStudents = group.reduce(
        (sum, section) => sum + section.No_Of_Students,
        0
      );
  
      // We'll have two strategies:
      // a) If totalStudents ≤ 50, schedule them together with one Schedule entry.
      // b) If totalStudents > 50, schedule each section individually.
      if (totalStudents <= 50) {
        // Try to schedule a single class for the entire group.
        for (const room of rooms) {
          for (let day = 1; day <= 5; day++) {
            // Initialize professor's schedule for the day if not already set.
            if (!professorSchedule[Professor.id][day]) {
              professorSchedule[Professor.id][day] = { hours: 0, dailyTimes: [] };
            }
            // Initialize course schedule for the day.
            if (!courseSchedules[Course.id]) courseSchedules[Course.id] = {};
            if (!courseSchedules[Course.id][day]) courseSchedules[Course.id][day] = [];
  
            for (let hour = startHour; hour + duration <= endHour; hour++) {
              if (
                canScheduleProfessor(professorSchedule[Professor.id][day], hour, duration) &&
                canScheduleStudent(courseSchedules[Course.id][day], hour, duration) &&
                (await isRoomAvailable(room.id, day, hour, duration))
              ) {
                // Create a single Schedule entry for this group.
                const createdSchedule = await Schedule.create({
                  Day: day,
                  Start_time: `${hour}:00`,
                  End_time: `${hour + duration}:00`,
                  RoomId: room.id,
                  AssignationId: assignation.id
                });
  
                // Link the created schedule with all sections in the group.
                for (const section of group) {
                  await SectionSched.create({
                    ProgYrSecId: section.id,
                    ScheduleId: createdSchedule.id
                  });
                }
  
                // Update temporary tracking.
                professorSchedule[Professor.id][day].hours += duration;
                professorSchedule[Professor.id][day].dailyTimes.push({ start: hour, end: hour + duration });
                courseSchedules[Course.id][day].push({ start: hour, end: hour + duration });
  
                // Add details to the report.
                report.push({
                  Professor: Professor.Name,
                  Course: Course.Code,
                  CourseType: Course.Type,
                  CombinedSections: group.map(sec =>
                    `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`
                  ),
                  Room: room.Code,
                  Day: day,
                  Start_time: `${hour}:00`,
                  End_time: `${hour + duration}:00`
                });
  
                // Recursive step: try scheduling the next assignation.
                if (
                  await backtrackSchedule(
                    assignations,
                    rooms,
                    professorSchedule,
                    courseSchedules,
                    index + 1,
                    report,
                    startHour,
                    endHour
                  )
                ) {
                  return true;
                }
  
                // Backtrack if necessary.
                await createdSchedule.destroy();
                // (Assuming ON DELETE CASCADE removes the associated SectionSched rows)
                professorSchedule[Professor.id][day].hours -= duration;
                professorSchedule[Professor.id][day].dailyTimes.pop();
                courseSchedules[Course.id][day].pop();
                report.pop();
              }
            }
          }
        }
      } else {
        // Total students > 50: schedule each section in the group individually.
        for (const section of group) {
          for (const room of rooms) {
            for (let day = 1; day <= 5; day++) {
              if (!professorSchedule[Professor.id][day]) {
                professorSchedule[Professor.id][day] = { hours: 0, dailyTimes: [] };
              }
              if (!courseSchedules[Course.id]) courseSchedules[Course.id] = {};
              if (!courseSchedules[Course.id][day]) courseSchedules[Course.id][day] = [];
  
              for (let hour = startHour; hour + duration <= endHour; hour++) {
                if (
                  canScheduleProfessor(professorSchedule[Professor.id][day], hour, duration) &&
                  canScheduleStudent(courseSchedules[Course.id][day], hour, duration) &&
                  (await isRoomAvailable(room.id, day, hour, duration))
                ) {
                  // Create a separate Schedule entry for this section.
                  const createdSchedule = await Schedule.create({
                    Day: day,
                    Start_time: `${hour}:00`,
                    End_time: `${hour + duration}:00`,
                    RoomId: room.id,
                    AssignationId: assignation.id
                  });
  
                  // Link the schedule to the individual section.
                  await SectionSched.create({
                    ProgYrSecId: section.id,
                    ScheduleId: createdSchedule.id
                  });
  
                  // Update temporary tracking.
                  professorSchedule[Professor.id][day].hours += duration;
                  professorSchedule[Professor.id][day].dailyTimes.push({ start: hour, end: hour + duration });
                  courseSchedules[Course.id][day].push({ start: hour, end: hour + duration });
  
                  report.push({
                    Professor: Professor.Name,
                    Course: Course.Code,
                    CourseType: Course.Type,
                    Section: `ProgId=${section.ProgramId}, Year=${section.Year}, Sec=${section.Section}`,
                    Room: room.Code,
                    Day: day,
                    Start_time: `${hour}:00`,
                    End_time: `${hour + duration}:00`
                  });
  
                  if (
                    await backtrackSchedule(
                      assignations,
                      rooms,
                      professorSchedule,
                      courseSchedules,
                      index + 1,
                      report,
                      startHour,
                      endHour
                    )
                  ) {
                    return true;
                  }
  
                  // Backtrack if needed.
                  await createdSchedule.destroy();
                  professorSchedule[Professor.id][day].hours -= duration;
                  professorSchedule[Professor.id][day].dailyTimes.pop();
                  courseSchedules[Course.id][day].pop();
                  report.pop();
                }
              }
            }
          }
        }
      }
    }
  
    // If no valid scheduling possibility was found, return false.
    return false;
  };

const automateSchedule = async (req, res, next) => {
    try {
        const { DepartmentId } = req.body;

        if (!DepartmentId) {
            return res.status(400).json({ successful: false, message: "Department ID is required." });
        }

        // Fetch scheduling settings
        const settings = await Settings.findByPk(1);
        if (!settings) {
            return res.status(404).json({ successful: false, message: "Scheduling settings not found." });
        }

        const { StartHour, EndHour } = settings; // Use configurable Start & End hour

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
        console.log(rooms);
        const professorSchedule = {};
        const courseSchedules = {};
        const report = [];

        // Initialize professor schedules by day
        assignations.forEach(assignation => {
            const { Professor } = assignation;
            if (!professorSchedule[Professor.id]) {
                professorSchedule[Professor.id] = {};
                for (let day = 1; day <= 5; day++) {
                    professorSchedule[Professor.id][day] = { hours: 0, dailyTimes: [] };
                }
            }
        });

        // Start backtracking
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
};

module.exports = {
    addSchedule,
    automateSchedule,
    getSchedule,
    getAllSchedules,
    updateSchedule,
    deleteSchedule
};
