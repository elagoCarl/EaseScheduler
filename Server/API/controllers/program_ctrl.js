const { Program, Department, Course } = require('../models');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;
const util = require('../../utils');
const { Op } = require('sequelize');
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');

const addProgram = async (req, res, next) => {
  try {
    let programsToAdd = req.body;

    // Checking if programsToAdd is an array
    if (!Array.isArray(programsToAdd)) {
      programsToAdd = [programsToAdd]; // Convert to an array if not already
    }

    for (const programData of programsToAdd) {
      const { Code, Name, DepartmentId } = programData;

      if (!util.checkMandatoryFields([Code, Name, DepartmentId])) {
        return res.status(400).json({
          successful: false,
          message: "A mandatory field is missing.",
        });
      }

      // Check if the department exists
      const department = await Department.findByPk(DepartmentId);
      if (!department) {
        return res.status(404).json({
          successful: false,
          message: `Department with ID ${DepartmentId} does not exist.`,
        });
      }

      // Check if Program Code or Name already exists
      const existingProgram = await Program.findOne({
        where: {
          [Op.or]: [{ Code }, { Name }]
        }
      });

      if (existingProgram) {
        return res.status(406).json({
          successful: false,
          message: `Program with Code "${Code}" or Name "${Name}" already exists.`,
        });
      }

      // Create the new program
      await Program.create({ Code, Name, DepartmentId });

      // Log the archive action
      const token = req.cookies?.refreshToken;
      if (!token) {
        return res.status(401).json({
          successful: false,
          message: "Unauthorized: refreshToken not found."
        });
      }
      let decoded;
      try {
        decoded = jwt.verify(token, REFRESH_TOKEN_SECRET); // or your secret key
      } catch (err) {
        return res.status(403).json({
          successful: false,
          message: "Invalid refreshToken."
        });
      }
      const accountId = decoded.id || decoded.accountId; // adjust based on your token payload
      const page = 'Program';
      const details = `Added Program${Code, Name}`;

      await addHistoryLog(accountId, page, details);

    }

    return res.status(201).json({
      successful: true,
      message: "Successfully added new program(s).",
    });
  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
};

const getProgram = async (req, res, next) => {
  try {
    const programId = req.params.id
    const program = await Program.findByPk(programId, {
      include: {
        model: Department,
        attributes: ['Name']
      }
    })
    if (!program) {
      return res.status(404).json({
        successful: false,
        message: `Program with ID ${programId} not found.`,
      });
    }

    return res.status(200).json({
      successful: true,
      message: `Successfully retrieved program with ID ${programId}.`,
      data: program,
    });
  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
};

const getAllProgram = async (req, res, next) => {
  try {
    const programs = await Program.findAll({
      include: {
        model: Department,
        attributes: ['Name']
      }
    })

    if (!programs || programs.length === 0) {
      return res.status(200).json({
        successful: true,
        message: "No programs found.",
        count: 0,
        data: [],
      });
    }

    return res.status(200).json({
      successful: true,
      message: "Retrieved all programs.",
      count: programs.length,
      data: programs,
    });
  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
};

const updateProgram = async (req, res, next) => {
  try {
    const programId = req.params.id; // Retrieve id from request parameters
    const { Code, Name, DepartmentId } = req.body; // Fields to update

    if (!util.checkMandatoryFields([Code, Name, DepartmentId])) {
      return res.status(400).json({
        successful: false,
        message: "A mandatory field is missing.",
      });
    }
    const program = await Program.findByPk(programId);
    if (!program) {
      return res.status(404).json({
        successful: false,
        message: `Program with ID ${programId} not found.`,
      });
    }

    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({
        successful: false,
        message: "Unauthorized: refreshToken not found."
      });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, REFRESH_TOKEN_SECRET); // or your secret key
    } catch (err) {
      return res.status(403).json({
        successful: false,
        message: "Invalid refreshToken."
      });
    }
    const accountId = decoded.id || decoded.accountId; // adjust based on your token payload
    const page = 'Program';
    const details = `Program Updated: Old; Code:${program.Code},Name${program.Name};;; New; Code:${Code}, Name:${Name}`;

    await addHistoryLog(accountId, page, details);

    // Validate DepartmentId if provided
    if (DepartmentId) {
      const department = await Department.findByPk(DepartmentId);
      if (!department) {
        return res.status(404).json({
          successful: false,
          message: `Department with ID ${DepartmentId} does not exist.`,
        });
      }
    }

    // Check if Code or Name already exists (excluding the current program)
    if (Code || Name) {
      const existingProgram = await Program.findOne({
        where: {
          [Op.or]: [{ Code }, { Name }],
          id: { [Op.ne]: programId },
        },
      });

      if (existingProgram) {
        return res.status(406).json({
          successful: false,
          message: `Program with Code "${Code}" or Name "${Name}" already exists.`,
        });
      }
    }

    // Update the program
    await program.update({ Code, Name, DepartmentId });
    return res.status(200).json({
      successful: true,
      message: `Program with ID "${programId}" updated successfully.`,
      data: program,
    });
  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
};

const deleteProgram = async (req, res, next) => {
  try {
    const programId = req.params.id; // Retrieve id from request parameters

    // Check if the program exists
    const program = await Program.findByPk(programId);
    if (!program) {
      return res.status(404).json({
        successful: false,
        message: `Program with ID ${programId} not found.`,
      });
    }

    // Delete the program
    await program.destroy();

    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({
        successful: false,
        message: "Unauthorized: refreshToken not found."
      });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, REFRESH_TOKEN_SECRET); // or your secret key
    } catch (err) {
      return res.status(403).json({
        successful: false,
        message: "Invalid refreshToken."
      });
    }
    const accountId = decoded.id || decoded.accountId; // adjust based on your token payload
    const page = 'Program';
    const details = `Program Deleted${program.Code, program.Name}`;

    await addHistoryLog(accountId, page, details);

    return res.status(200).json({
      successful: true,
      message: `Program with Program Code ${program.Code} deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
};

const getAllProgramByCourse = async (req, res, next) => {
  try {
    const CourseId = req.params.id
    const programs = await Program.findAll({ where: { CourseId } })
    if (!programs || programs.length === 0) {
      return res.status(200).json({
        successful: false,
        message: "No programs found.",
        count: 0,
        data: [],
      })
    }

    return res.status(200).json({
      successful: true,
      message: "Retrieved all programs.",
      count: programs.length,
      data: programs,
    });
  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
};

const getAllProgramByDept = async (req, res, next) => {
  try {
    const programs = await Program.findAll({ where: { DepartmentId: req.params.id } })
    if (!programs || programs.length === 0) {
      return res.status(200).json({
        successful: false,
        message: "No programs found.",
        count: 0,
        data: [],
      })
    }

    return res.status(200).json({
      successful: true,
      message: "Retrieved all programs.",
      count: programs.length,
      data: programs,
    });
  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
};

const addCourseProg = async (req, res) => {
  try {
    const { courseId, programId } = req.body;

    if (!util.checkMandatoryFields([courseId, programId])) {
      return res.status(400).json({
        successful: false,
        message: "A mandatory field is missing.",
      });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        successful: false,
        message: "Course not found.",
      });
    }

    const prog = await Program.findByPk(programId);
    if (!prog) {
      return res.status(404).json({
        successful: false,
        message: "Program not found.",
      });
    }

    const existingPairing = await course.hasCourseProgs(programId);
    if (existingPairing) {
      return res.status(400).json({
        successful: false,
        message: "This course is already associated with this program.",
      });
    }

    await course.addCourseProgs(programId);

    return res.status(200).json({
      successful: true,
      message: "Successfully associated course with program.",
    });
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const deleteCourseProg = async (req, res) => {
  try {
    const { courseId, progId } = req.body;

    if (!util.checkMandatoryFields([courseId, progId])) {
      return res.status(400).json({
        successful: false,
        message: "A mandatory field is missing.",
      });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        successful: false,
        message: "Course not found.",
      });
    }

    const prog = await Program.findByPk(progId);
    if (!prog) {
      return res.status(404).json({
        successful: false,
        message: "Program not found.",
      });
    }

    const existingAssociation = await course.hasCourseProgs(progId);
    if (!existingAssociation) {
      return res.status(404).json({
        successful: false,
        message:
          "Association between the course and program does not exist.",
      });
    }

    await course.removeCourseProgs(progId);

    return res.status(200).json({
      successful: true,
      message: "Successfully deleted association.",
    });
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const getCoursesByProg = async (req, res, next) => {
  try {
    const progId = req.params.id;
    const courses = await Course.findAll({
      attributes: { exclude: ["CourseProgs"] },
      include: {
        model: Program,
        as: "CourseProgs",
        where: {
          id: progId,
        },
        attributes: [],
        through: {
          attributes: [],
        },
      },
    });
    if (!courses || courses.length === 0) {
      res.status(200).send({
        successful: true,
        message: "No courses found",
        count: 0,
        data: [],
      });
    } else {
      res.status(200).send({
        successful: true,
        message: "Retrieved all courses",
        count: courses.length,
        data: courses,
      });
    }
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const updateCourseProg = async (req, res, next) => {
  try {
    const { oldCourseId, oldProgId, newCourseId, newProgId } = req.body;

    if (
      !util.checkMandatoryFields([
        oldCourseId,
        oldProgId,
        newCourseId,
        newProgId,
      ])
    ) {
      return res.status(400).json({
        successful: false,
        message: "A mandatory field is missing.",
      });
    }

    const oldCourse = await Course.findByPk(oldCourseId);
    if (!oldCourse) {
      return res.status(404).json({
        successful: false,
        message: "Course not found.",
      });
    }

    const oldProg = await Program.findByPk(oldProgId);
    if (!oldProg) {
      return res.status(404).json({
        successful: false,
        message: "Program not found.",
      });
    }

    const newCourse = await Course.findByPk(newCourseId);
    if (!newCourse) {
      return res.status(404).json({
        successful: false,
        message: "Course not found.",
      });
    }

    const newProg = await Program.findByPk(newProgId);
    if (!newProg) {
      return res.status(404).json({
        successful: false,
        message: "Program not found.",
      });
    }

    const existingAssociation = await oldCourse.hasCourseProgs(oldProgId);
    if (!existingAssociation) {
      return res.status(404).json({
        successful: false,
        message:
          "Association between the old course and old program does not exist.",
      });
    }

    const newExistingPairing = await newCourse.hasCourseProgs(newProgId);
    if (newExistingPairing) {
      return res.status(400).json({
        successful: false,
        message: "New course is already associated with the new program.",
      });
    }

    await oldProg.removeProgCourses(oldCourseId);
    await newProg.addProgCourses(newCourseId);

    return res.status(200).json({
      successful: true,
      message: "Association updated successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

module.exports = {
  addProgram,
  getProgram,
  getAllProgram,
  updateProgram,
  deleteProgram,
  getAllProgramByCourse,
  addCourseProg,
  deleteCourseProg,
  getCoursesByProg,
  updateCourseProg,
  getAllProgramByDept
};
