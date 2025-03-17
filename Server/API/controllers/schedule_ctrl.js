// Change the Course into Course model because it is not being imported properly
const { Settings, Schedule, Room, Assignation, Program, Professor, Course, ProgYrSec, Department, Course: CourseModel } = require('../models');
const { Op } = require('sequelize');
const util = require("../../utils");
const { json } = require('body-parser');

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

/**
 * Helper function to check room availability.
 */
// Optimize room availability check
const isRoomAvailable = (roomSchedules, roomId, day, startHour, duration) => {
    if (!roomSchedules[roomId] || !roomSchedules[roomId][day]) return true;
    
    return !roomSchedules[roomId][day].some(time => 
      (startHour >= time.start && startHour < time.end) ||
      (startHour + duration > time.start && startHour + duration <= time.end) ||
      (startHour <= time.start && startHour + duration >= time.end)
    );
  };
  
  const canScheduleProfessor = (profSchedule, startHour, duration, settings) => {
    const requiredBreak = settings.ProfessorBreak || 1; // break duration in hours (default 1 hour)
    
    // Check maximum allowed hours
    if (profSchedule.hours + duration > settings.ProfessorMaxHours) return false;
    
    // Check for overlapping times
    for (const time of profSchedule.dailyTimes) {
      if (
        (startHour >= time.start && startHour < time.end) ||
        (startHour + duration > time.start && startHour + duration <= time.end)
      ) {
        return false;
      }
    }
    
    // Enforce a gap after 5 consecutive hours:
    // Determine if the new course would be scheduled immediately after an existing block.
    // (We assume courses are scheduled in whole hours and contiguous if new start equals an existing interval’s end.)
    const intervals = [...profSchedule.dailyTimes].sort((a, b) => a.start - b.start);
    let contiguousBlockStart = null;
    
    // Look for an interval that ends exactly at the candidate start time.
    for (let i = 0; i < intervals.length; i++) {
      if (intervals[i].end === startHour) {
        // Found an interval that is immediately before the new course.
        // Now determine the start of this contiguous block.
        contiguousBlockStart = intervals[i].start;
        // Walk backwards to see if earlier intervals attach continuously.
        for (let j = i - 1; j >= 0; j--) {
          if (intervals[j].end === contiguousBlockStart) {
            contiguousBlockStart = intervals[j].start;
          } else {
            break;
          }
        }
        break;
      }
    }
    
    // If there is a contiguous block ending at the candidate start, check its total duration.
    if (contiguousBlockStart !== null) {
      const blockDuration = startHour - contiguousBlockStart;
      if (blockDuration >= 5) {
        // The professor has already worked 5 consecutive hours.
        // Therefore, the next course cannot start immediately—it must start only after the break.
        return false;
      }
    }
    
    return true;
  };
  
  const canScheduleStudents = (secSchedule, startHour, duration, settings) => {
    const requiredBreak = settings.StudentBreak || 1; // break duration in hours (default 1 hour)
    
    // Check maximum allowed hours for students
    if (secSchedule.hours + duration > settings.StudentMaxHours) return false;
    
    // Check for overlapping scheduled courses
    for (const time of secSchedule.dailyTimes) {
      if (
        (startHour >= time.start && startHour < time.end) ||
        (startHour + duration > time.start && startHour + duration <= time.end)
      ) {
        return false;
      }
    }
    
    // Enforce gap after 5 consecutive hours:
    const intervals = [...secSchedule.dailyTimes].sort((a, b) => a.start - b.start);
    let contiguousBlockStart = null;
    
    for (let i = 0; i < intervals.length; i++) {
      if (intervals[i].end === startHour) {
        contiguousBlockStart = intervals[i].start;
        for (let j = i - 1; j >= 0; j--) {
          if (intervals[j].end === contiguousBlockStart) {
            contiguousBlockStart = intervals[j].start;
          } else {
            break;
          }
        }
        break;
      }
    }
    
    if (contiguousBlockStart !== null) {
      const blockDuration = startHour - contiguousBlockStart;
      if (blockDuration >= 5) {
        return false;
      }
    }
    
    return true;
  };
  
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
  

/**
 * Backtracking function to automate schedule generation.
 * Added a new parameter `progYrSecSchedules` to track schedules for each ProgYrSec.
 */
// Optimized backtracking function
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

          // Attempt to schedule as many courses as possible for the same day
          for (let day = 1; day <= 5; day++) {
              let scheduledHours = 0; // Track total hours scheduled for the section that day

              // Find an available room & slot where we can fit multiple courses
              for (const room of rooms) {
                  let hour = startHour;

                  while (hour + duration <= endHour && scheduledHours < settings.StudentMaxHours) {
                      const sectionIds = group.map(sec => sec.id);

                      // Check if scheduling is possible for the whole group
                      if (isSchedulePossible(
                          roomSchedules, professorSchedule, progYrSecSchedules,
                          room.id, Professor.id, sectionIds, day, hour, duration,
                          settings
                      )) {
                          // Create the schedule entry
                          const createdSchedule = await Schedule.create({
                              Day: day,
                              Start_time: `${hour}:00`,
                              End_time: `${hour + duration}:00`,
                              RoomId: room.id,
                              AssignationId: assignation.id
                          });

                          // Associate sections with the schedule
                          await createdSchedule.addProgYrSecs(group);

                          // Update schedule tracking
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

                          // Add to report
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

                          // Move hour forward for the next course
                          hour += duration;
                          scheduledHours += duration;

                          // Try scheduling another course for the same section on the same day
                          if (await backtrackSchedule(
                              assignations, rooms, professorSchedule, courseSchedules,
                              progYrSecSchedules, roomSchedules, index + 1, report,
                              startHour, endHour, settings
                          )) {
                              return true;
                          }

                          // If unsuccessful, backtrack
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
                          // If the course cannot be scheduled in this slot, try the next time block
                          hour += duration;
                      }
                  }

                  // Stop scheduling for the day if max hours reached
                  if (scheduledHours >= settings.StudentMaxHours) break;
              }
          }
      }

      // Recursively move to the next assignation
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
      
      const settings = await Settings.findByPk(1);
      if (!settings) {
        return res.status(404).json({ successful: false, message: "Scheduling settings not found." });
      }
      
      const { StartHour, EndHour } = settings;
      
      const department = await Department.findByPk(DepartmentId, {
        include: [
          { model: Assignation, include: [Course, Professor] },
          { model: Room, as: 'DeptRooms' }
        ]
      });
      
      if (!department) {
        return res.status(404).json({ successful: false, message: "Department not found." });
      }
      
      // Clear existing schedules
      await Schedule.destroy({
        where: { AssignationId: { [Op.in]: department.Assignations.map(a => a.id) } }
      });
      
      const assignations = department.Assignations;
      const rooms = department.DeptRooms;
      
      // Initialize data structures for tracking
      const professorSchedule = {};
      const courseSchedules = {};
      const progYrSecSchedules = {};
      const roomSchedules = {}; // New data structure to track room schedules
      const report = [];
      
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
      
      // Pre-fetch all ProgYrSec entities to speed up later queries
      const allProgYrSecs = await ProgYrSec.findAll();
      
      // Initialize ProgYrSec schedules
      allProgYrSecs.forEach(section => {
        progYrSecSchedules[section.id] = {};
        for (let day = 1; day <= 5; day++) {
          progYrSecSchedules[section.id][day] = { hours: 0, dailyTimes: [] };
        }
      });
      
      // Sort assignations by complexity to improve backtracking efficiency
      assignations.sort((a, b) => {
        // Prioritize by course type (Professional before Core)
        if (a.Course.Type !== b.Course.Type) {
          return a.Course.Type === "Professional" ? -1 : 1;
        }
        // Then by duration (longer courses first)
        return b.Course.Duration - a.Course.Duration;
      });
      
      const success = await backtrackSchedule(
        assignations, rooms, professorSchedule, courseSchedules, 
        progYrSecSchedules, roomSchedules, 0, report, 
        StartHour, EndHour, settings
      );
      
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
                            attributes: ['id','Name']
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
