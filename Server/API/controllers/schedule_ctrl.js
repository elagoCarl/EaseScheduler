
// Change the Course into Course model because it is not being imported properly
const { Settings, Schedule, Room, Assignation, Program, Professor, Course, ProgYrSec, SectionSched, Department, Course: CourseModel } = require('../models');
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

const backtrackSchedule = async (assignations, rooms, professorSchedule, courseSchedules, index, report, startHour, endHour) => {
  console.log("Entered backtracking");

  // Base case: if all assignations are scheduled, return true.
  if (index === assignations.length) return true;

  const assignation = assignations[index];
  const { Course, Professor } = assignation;
  const duration = Course.Duration;

  console.log("Processing Course:", Course.Code, "Type:", Course.Type);

  let validProgYrSecs = [];

  if (Course.Type === "Core") {
      console.log("Processing Core Course");

      validProgYrSecs = await ProgYrSec.findAll({
          where: { Year: Course.Year }
      });

      if (!validProgYrSecs.length) {
          console.log(`No sections found for Core Course ${Course.Code} with Year=${Course.Year}`);
          return false;
      }
  } else if (Course.Type === "Professional") {
      console.log("Processing Professional Course");

      // Fetch allowed programs through the Course-Program association
      console.log("Courseeeee: ", Course);
      const courseWithPrograms = await CourseModel.findOne({
        where: { id: Course.id },
        include: {
            model: Program,
            as: 'CourseProgs',
            attributes: ['id']
        }
    });
    

      if (!courseWithPrograms || !courseWithPrograms.CourseProgs.length) {
          console.log(`No allowed programs for Professional Course ${Course.Code}`);
          return false;
      }

      const allowedProgramIds = courseWithPrograms.CourseProgs.map(program => program.id);

      validProgYrSecs = await ProgYrSec.findAll({
          where: {
              Year: Course.Year,
              ProgramId: { [Op.in]: allowedProgramIds }
          }
      });

      if (!validProgYrSecs.length) {
          console.log(`No matching sections for Professional Course ${Course.Code}`);
          return false;
      }
  } else {
      console.log(`Unknown Course Type: ${Course.Type}`);
      return false;
  }

  console.log("Grouping valid sections by Program and Year...");
  const groups = {};
  validProgYrSecs.forEach(section => {
      const key = `${section.ProgramId}-${section.Year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(section);
  });

  for (const groupKey in groups) {
      const group = groups[groupKey];
      const totalStudents = group.reduce((sum, section) => sum + section.No_Of_Students, 0); 

      const schedulingStrategy = totalStudents <= 50 ? "combined" : "separate";
      console.log(`Using ${schedulingStrategy} scheduling for ${group.length} sections`);

      const scheduleGroup = async (sectionGroup, room, day, hour) => {
          const createdSchedule = await Schedule.create({
              Day: day,
              Start_time: `${hour}:00`,
              End_time: `${hour + duration}:00`,
              RoomId: room.id,
              AssignationId: assignation.id
          });

          for (const section of sectionGroup) {
              await SectionSched.create({
                  ProgYrSecId: section.id,
                  ScheduleId: createdSchedule.id
              });
          }

          professorSchedule[Professor.id][day].hours += duration;
          professorSchedule[Professor.id][day].dailyTimes.push({ start: hour, end: hour + duration });
          courseSchedules[Course.id][day].push({ start: hour, end: hour + duration });

          report.push({
              Professor: Professor.Name,
              Course: Course.Code,
              CourseType: Course.Type,
              Sections: sectionGroup.map(sec => `ProgId=${sec.ProgramId}, Year=${sec.Year}, Sec=${sec.Section}`),
              Room: room.Code,
              Day: day,
              Start_time: `${hour}:00`,
              End_time: `${hour + duration}:00`
          });

          if (await backtrackSchedule(assignations, rooms, professorSchedule, courseSchedules, index + 1, report, startHour, endHour)) {
              return true;
          }

          await createdSchedule.destroy();
          professorSchedule[Professor.id][day].hours -= duration;
          professorSchedule[Professor.id][day].dailyTimes.pop();
          courseSchedules[Course.id][day].pop();
          report.pop();

          return false;
      };

      for (const room of rooms) {
          for (let day = 1; day <= 5; day++) {
              for (let hour = startHour; hour + duration <= endHour; hour++) {
                  if (
                      canScheduleProfessor(professorSchedule[Professor.id][day], hour, duration) &&
                      canScheduleStudent(courseSchedules[Course.id][day], hour, duration) &&
                      (await isRoomAvailable(room.id, day, hour, duration))
                  ) {
                      if (await scheduleGroup(group, room, day, hour)) {
                          return true;
                      }
                  }
              }
          }
      }
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
          include: [{ model: Assignation, include: [Course, Professor] }]
      });

      if (!department) {
          return res.status(404).json({ successful: false, message: "Department not found." });
      }

      await Schedule.destroy({
          where: { AssignationId: { [Op.in]: department.Assignations.map(a => a.id) } }
      });

      const assignations = department.Assignations;
      const rooms = await Room.findAll();
      const professorSchedule = {};
      const courseSchedules = {};
      const report = [];

      assignations.forEach(assignation => {
          const { Professor } = assignation;
          if (!professorSchedule[Professor.id]) {
              professorSchedule[Professor.id] = {};
              for (let day = 1; day <= 5; day++) {
                  professorSchedule[Professor.id][day] = { hours: 0, dailyTimes: [] };
              }
          }
      });

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
