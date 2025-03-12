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
  
  // Consolidated constraint check
  const isSchedulePossible = (
    roomSchedules, professorSchedule, progYrSecSchedules,
    roomId, professorId, sectionIds, day, startHour, duration,
    settings
  ) => {
    // Check room
    if (!isRoomAvailable(roomSchedules, roomId, day, startHour, duration)) return false;
    
    // Check professor constraints
    const profSchedule = professorSchedule[professorId][day];
    if (profSchedule.hours + duration > settings.ProfessorMaxHours) return false;
    
    if (profSchedule.dailyTimes.some(time => 
      (startHour >= time.start && startHour < time.end) ||
      (startHour + duration > time.start && startHour + duration <= time.end)
    )) return false;
    
    // Check section constraints
    for (const sectionId of sectionIds) {
      const secSchedule = progYrSecSchedules[sectionId][day];
      if (secSchedule.hours + duration > settings.StudentMaxHours) return false;
      
      if (secSchedule.dailyTimes.some(time => 
        (startHour >= time.start && startHour < time.end) ||
        (startHour + duration > time.start && startHour + duration <= time.end)
      )) return false;
    }
    
    return true;
  };

/**
 * Helper function to check professor constraints.
 */
const canScheduleProfessor = async (professorSchedule, startHour, duration) => {
    const settings = await Settings.findByPk(1);
    if (!settings) return res.status(500).json({
        sucessful: false,
        message: "Schedule settings for scheduling validation not found."
    });
    if (professorSchedule.hours + duration > settings.ProfessorMaxHours) return false; // Exceeds max hours
    for (const time of professorSchedule.dailyTimes) {
        if (
            (startHour >= time.start && startHour < time.end) ||
            (startHour + duration > time.start && startHour + duration <= time.end)
        ) {
            return false;
        }
    }
    return true;
};

/**
 * Helper function to check student (ProgYrSec) constraints.
 */
const canScheduleStudents = async (progYrSecSchedule, startHour, duration) => {
    const settings = await Settings.findByPk(1);
    if (!settings) {
        return res.status(500).json({
            successful: false,
            message: "Schedule settings for scheduling validation not found."
        });
    }
    if (progYrSecSchedule.hours + duration > settings.StudentMaxHours) return false;
    for (const time of progYrSecSchedule.dailyTimes) {
        if (
            (startHour >= time.start && startHour < time.end) ||
            (startHour + duration > time.start && startHour + duration <= time.end)
        ) {
            return false;
        }
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
    // Base case: all assignations scheduled
    if (index === assignations.length) return true;
  
    const assignation = assignations[index];
    const { Course, Professor } = assignation;
    const duration = Course.Duration;
    
    // Get or fetch valid sections
    let validProgYrSecs = [];
    try {
      if (Course.Type === "Core") {
        validProgYrSecs = await ProgYrSec.findAll({ where: { Year: Course.Year } });
      } else if (Course.Type === "Professional") {
        const courseWithPrograms = await CourseModel.findOne({
          where: { id: Course.id },
          include: {
            model: Program,
            as: 'CourseProgs',
            attributes: ['id']
          }
        });
        
        if (courseWithPrograms && courseWithPrograms.CourseProgs.length) {
          const allowedProgramIds = courseWithPrograms.CourseProgs.map(program => program.id);
          validProgYrSecs = await ProgYrSec.findAll({
            where: {
              Year: Course.Year,
              ProgramId: { [Op.in]: allowedProgramIds }
            }
          });
        }
      }
      
      if (!validProgYrSecs.length) return false;
      
      // Group sections by program and year
      const groups = {};
      validProgYrSecs.forEach(section => {
        const key = `${section.ProgramId}-${section.Year}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(section);
      });
      
      // Try to schedule each group
      for (const groupKey in groups) {
        const group = groups[groupKey];
        
        // Iterate through possible days, rooms, and hours
        for (let day = 1; day <= 5; day++) {
          for (const room of rooms) {
            for (let hour = startHour; hour + duration <= endHour; hour++) {
              const sectionIds = group.map(section => section.id);
              
              // Check if schedule is possible with current constraints
              if (isSchedulePossible(
                roomSchedules, professorSchedule, progYrSecSchedules,
                room.id, Professor.id, sectionIds, day, hour, duration,
                settings
              )) {
                // Create schedule
                const createdSchedule = await Schedule.create({
                  Day: day,
                  Start_time: `${hour}:00`,
                  End_time: `${hour + duration}:00`,
                  RoomId: room.id,
                  AssignationId: assignation.id
                });
                
                // Associate sections
                await createdSchedule.addProgYrSecs(group);
                
                // Update tracking data structures
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
                
                // Recursively try to schedule next assignation
                if (await backtrackSchedule(
                  assignations, rooms, professorSchedule, courseSchedules, 
                  progYrSecSchedules, roomSchedules, index + 1, report, 
                  startHour, endHour, settings
                )) {
                  return true;
                }
                
                // Backtrack: undo changes
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
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error scheduling ${Course.Code}:`, error);
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
}; 

module.exports = {
    addSchedule,
    automateSchedule,
    getSchedule,
    getAllSchedules,
    updateSchedule,
    deleteSchedule
};
