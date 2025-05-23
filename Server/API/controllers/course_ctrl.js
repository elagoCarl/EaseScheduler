const jwt = require("jsonwebtoken");
const { REFRESH_TOKEN_SECRET } = process.env;
const { Course, Professor, Department, Settings, CourseProg, RoomType, Program, Pair } = require("../models");
const util = require("../../utils");
const { Op } = require("sequelize");
const { addHistoryLog } = require("../controllers/historyLogs_ctrl");

const addCourse = async (req, res) => {
  try {
    let courses = req.body;

    // Ensure the request body is an array
    if (!Array.isArray(courses)) {
      courses = [courses];
    }

    const addedCourses = [];

    // Check if this is a pair of courses (exactly 2 courses)
    const isPair = courses.length === 2;

    // If it's a pair, validate that we have a lecture and lab course
    let pairId = null;
    if (isPair) {
      // Check if one code ends with L (lab) and the other doesn't
      const hasLabCourse = courses.some(course => course.Code.endsWith('L'));
      const hasLectureCourse = courses.some(course => !course.Code.endsWith('L'));

      if (!hasLabCourse || !hasLectureCourse) {
        return res.status(400).json({
          successful: false,
          message: "For course pairs, one course should be a lab course (ending with 'L').",
        });
      }

      // Create a pair record
      const newPair = await Pair.create({});
      pairId = newPair.id;
    }

    for (const course of courses) {
      const { Code, Description, Duration, Units, Type, DepartmentId, ProgYears, RoomTypeId, isTutorial = false } = course;

      // If tutorial, set Units to 0
      const finalUnits = isTutorial ? 0 : Units;

      // Validate mandatory fields
      if (!util.checkMandatoryFields([Code, Description, Duration, Type, DepartmentId, RoomTypeId])) {
        return res.status(400).json({
          successful: false,
          message: "A mandatory field is missing.",
        });
      }

      // Validate that Code is alphanumeric only
      if (!/^[a-zA-Z0-9]+$/.test(Code)) {
        return res.status(406).json({
          successful: false,
          message: "Course code must be alphanumeric (letters and numbers only, no spaces or special characters).",
        });
      }


      // For non-tutorial courses, require Units and ProgYears
      if (!isTutorial && (!Units || !ProgYears)) {
        return res.status(400).json({
          successful: false,
          message: "Units and ProgYears are required for non-tutorial courses.",
        });
      }

      if (Duration <= 0) {
        return res.status(406).json({
          successful: false,
          message: "Duration must be greater than 0.",
        });
      }

      // Add validation to limit Duration to a maximum of 5 hours
      if (Duration > 5) {
        return res.status(406).json({
          successful: false,
          message: "Duration cannot exceed 5 hours.",
        });
      }

      // Only check Units for non-tutorial courses
      if (!isTutorial && (Units <= 0)) {
        return res.status(406).json({
          successful: false,
          message: "Units must be greater than 0 for non-tutorial courses.",
        });
      }

      const department = await Department.findByPk(DepartmentId);
      if (!department) {
        return res.status(404).json({
          successful: false,
          message: `Department with ID ${DepartmentId} does not exist.`,
        });
      }

      const settings = await Settings.findOne();
      if (!settings) {
        return res.status(406).json({
          successful: false,
          message: "Settings not found.",
        });
      }

      // Units validation for non-tutorial courses
      if (!isTutorial && (Units < 0 || Units > 30)) {
        return res.status(406).json({
          successful: false,
          message: "Units should be between 0 and 30",
        });
      }

      const availableHours = settings.EndHour - settings.StartHour;
      if (Duration > availableHours) {
        return res.status(406).json({
          successful: false,
          message: `Duration cannot exceed available hours (${availableHours} hours between ${settings.StartHour}:00 and ${settings.EndHour}:00).`,
        });
      }

      const roomType = await RoomType.findByPk(RoomTypeId);
      if (!roomType) {
        return res.status(404).json({
          successful: false,
          message: "Room type not found.",
        });
      }

      // Check if the course already exists
      const existingCourse = await Course.findOne({
        where: {
          [Op.or]: [
            { Code: { [Op.like]: Code } },
            // { Description: { [Op.like]: Description } },
          ],
        },
      });

      if (existingCourse) {
        return res.status(400).json({
          successful: false,
          message: `Course with code ${Code} already exists.`,
        });
      }

      if (!["Core", "Professional"].includes(Type)) {
        return res.status(406).json({
          successful: false,
          message: "Invalid type. Allowed values are: Core, Professional.",
        });
      }

      // Create the new course with PairId if this is a pair, setting Units to 0 for tutorials
      const newCourse = await Course.create({
        Code,
        Description,
        Duration,
        Units: finalUnits,  // Use 0 for tutorials
        Type,
        RoomTypeId,
        isTutorial,
        PairId: pairId // Will be null if not a pair
      });

      await newCourse.addCourseDepts(DepartmentId);

      // Only create CourseProg entries for non-tutorial courses
      if (!isTutorial && ProgYears) {
        for (const prog of ProgYears) {
          const existingProg = await Program.findOne({
            where: {
              id: prog.ProgramId
            }
          });

          if (!existingProg) {
            return res.status(404).json({
              successful: false,
              message: `Program with ID ${prog.ProgramId} does not exist.`,
            });
          }

          if (prog.Year < 1 || prog.Year > 6) {
            return res.status(406).json({
              successful: false,
              message: "Year must be greater than 0 and less than 6.",
            });
          }

          // Validate Semester value
          if (prog.Semester !== 1 && prog.Semester !== 2) {
            return res.status(406).json({
              successful: false,
              message: "Semester must be either 1 or 2.",
            });
          }

          await CourseProg.create({
            CourseId: newCourse.id,
            ProgramId: prog.ProgramId,
            Year: prog.Year,
            Semester: prog.Semester
          });
        }
      }

      addedCourses.push(Code);
    }

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
    const page = "Course";
    const details = `Added Course${addedCourses.length > 1 ? "s" : ""}: ${addedCourses.join(", ")}${isPair ? " as a pair" : ""}`;

    await addHistoryLog(accountId, page, details);

    return res.status(201).json({
      successful: true,
      message: `Successfully added new course${courses.length > 1 ? "s" : ""}${isPair ? " as a pair" : ""}.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.findAll();

    if (!courses || courses.length === 0) {
      return res.status(200).json({
        successful: true,
        message: "No courses found",
        count: 0,
        data: [],
      });
    }

    return res.status(200).json({
      successful: true,
      message: "Retrieved all courses",
      count: courses.length,
      data: courses,
    });
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    // Find the course before deletion for detailed logging
    const course = await Course.findOne({
      where: { id: req.params.id },
    });

    if (!course) {
      return res.status(400).send({
        successful: false,
        message: "Course not found.",
      });
    }

    await CourseProg.destroy({
      where: { CourseId: req.params.id }
    })

    // Delete the course
    await Course.destroy({
      where: { id: req.params.id },
    });

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
    const page = "Course";
    const details = `Deleted Course: Code - ${course.Code}, Description - ${course.Description}`;

    await addHistoryLog(accountId, page, details);

    res.status(200).send({
      successful: true,
      message: "Successfully deleted course.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const getCourse = async (req, res, next) => {
  try {
    let prof = await Course.findByPk(req.params.id);

    if (!prof) {
      res.status(404).send({
        successful: false,
        message: "Course not found",
      });
    } else {
      res.status(200).send({
        successful: true,
        message: "Successfully retrieved Course.",
        data: prof,
      });
    }
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const updateCourse = async (req, res) => {
  try {
    // Find course by primary key
    const course = await Course.findByPk(req.params.id);
    const { Code, Description, Duration, Units, Type, RoomTypeId } = req.body;

    // Check if course exists
    if (!course) {
      return res.status(404).json({
        successful: false,
        message: "Course not found.",
      });
    }

    // Validate mandatory fields
    if (
      !util.checkMandatoryFields([Code, Description, Duration, Units, Type, RoomTypeId])
    ) {
      return res.status(400).json({
        successful: false,
        message: "A mandatory field is missing.",
      });
    }

    if (!/^[a-zA-Z0-9]+$/.test(Code)) {
      return res.status(406).json({
        successful: false,
        message: "Course code must be alphanumeric (letters and numbers only, no spaces or special characters).",
      });
    }

    if (Units < 0 || Units > 30) {
      return res.status(406).json({
        successful: false,
        message: "Units should be between 0 and 30",
      });
    }

    // Validate that `Duration` and `Units` are positive integers
    if (Duration <= 0 || Units < 0) {
      return res.status(406).json({
        successful: false,
        message: "Duration and Units must be positive integers.",
      });
    }

    // Add validation to limit Duration to a maximum of 5 hours
    if (Duration > 5) {
      return res.status(406).json({
        successful: false,
        message: "Duration cannot exceed 5 hours.",
      });
    }

    const roomType = await RoomType.findByPk(RoomTypeId);
    if (!roomType) {
      return res.status(404).json({
        successful: false,
        message: "Room type not found.",
      });
    }

    const existingCourse = await Course.findOne({
      where: {
        id: { [Op.ne]: req.params.id }, // Exclude the current course by ID
        [Op.or]: [
          { Code: { [Op.like]: Code } },
          // { Description: { [Op.like]: Description } },
        ],
      },
    });

    if (existingCourse) {
      return res.status(406).json({
        successful: false,
        message: `Course with code already exists.`,
      });
    }

    if (!["Core", "Professional"].includes(Type)) {
      return res.status(406).json({
        successful: false,
        message: "Invalid type. Allowed values are: Core, Professional.",
      });
    }

    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(406).json({
        successful: false,
        message: "Global settings not found.",
      });
    }

    const availableHours = settings.EndHour - settings.StartHour;
    if (Duration > availableHours) {
      return res.status(406).json({
        successful: false,
        message: `Duration cannot exceed available hours (${availableHours} hours between ${settings.StartHour}:00 and ${settings.EndHour}:00).`,
      });
    }

    // Store old course details for history logging
    const oldDetails = {
      Code: course.Code,
      Description: course.Description,
      Duration: course.Duration,
      Units: course.Units,
      Type: course.Type,
      RoomTypeId: course.RoomTypeId,
    };

    // Update course details
    await course.update({
      Code,
      Description,
      Duration,
      Units,
      Type,
      RoomTypeId
    })

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
    const page = "Course";
    const details = `Updated Course: Old Code: ${oldDetails.Code}, Desc: ${oldDetails.Description}, Duration: ${oldDetails.Duration}, Units: ${oldDetails.Units}, Type: ${oldDetails.Type}; New Code: ${Code}, Desc: ${Description}, Duration: ${Duration}, Units: ${Units}, Type: ${Type}`;

    await addHistoryLog(accountId, page, details);

    return res.status(200).json({
      successful: true,
      message: "Successfully updated course.",
    });
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const getCourseByProf = async (req, res, next) => {
  try {
    const profId = req.params.id;
    const courses = await Course.findAll({
      attributes: { exclude: ["CourseProfs"] },
      include: {
        model: Professor,
        as: "CourseProfs",
        where: {
          id: profId,
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

const addDeptCourse = async (req, res) => {
  try {
    const { courseId, deptId } = req.body;

    if (!util.checkMandatoryFields([courseId, deptId])) {
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

    const dept = await Department.findByPk(deptId);
    if (!dept) {
      return res.status(404).json({
        successful: false,
        message: "Department not found.",
      });
    }

    const existingPairing = await course.hasCourseDepts(deptId);
    if (existingPairing) {
      return res.status(400).json({
        successful: false,
        message: "This course is already associated with this department.",
      });
    }

    await course.addCourseDepts(deptId);

    return res.status(200).json({
      successful: true,
      message: "Successfully associated course with department.",
    });
  } catch (err) {
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const deleteDeptCourse = async (req, res) => {
  try {
    const { courseId, deptId } = req.body;

    if (!util.checkMandatoryFields([courseId, deptId])) {
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

    const dept = await Department.findByPk(deptId);
    if (!dept) {
      return res.status(404).json({
        successful: false,
        message: "Department not found.",
      });
    }

    const existingAssociation = await course.hasCourseDepts(deptId);
    if (!existingAssociation) {
      return res.status(404).json({
        successful: false,
        message:
          "Association between the course and department does not exist.",
      });
    }

    await course.removeCourseDepts(deptId);

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

const getCoursesByDept = async (req, res, next) => {
  try {
    const deptId = req.params.id;
    const courses = await Course.findAll({
      where: {
        [Op.or]: [
          { Type: "Core" },
          { "$CourseDepts.id$": deptId }
        ]
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Department,
          as: "CourseDepts",
          attributes: [], // Exclude department attributes if you don't need them
          required: false,
          through: {
            attributes: [] // Hide junction table fields
          }
        },
        {
          model: RoomType,
          attributes: ['id', 'Type'], // Include the RoomType attributes you want to show
          required: false
        },
        {
          model: CourseProg,
          as: "CourseProgs",
          attributes: ['Year', 'Semester', 'ProgramId'],
          required: false,

        }
      ]
    });

    if (!courses || courses.length === 0) {
      return res.status(200).send({
        successful: true,
        message: "No courses found",
        count: 0,
        data: [],
      });
    } else {
      return res.status(200).send({
        successful: true,
        message: "Retrieved all courses",
        count: courses.length,
        data: courses,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      successful: false,
      message: err.message || "An unexpected error occurred.",
    });
  }
};

const updateDeptCourse = async (req, res, next) => {
  try {
    const { oldCourseId, oldDeptId, newCourseId, newDeptId } = req.body;

    if (
      !util.checkMandatoryFields([
        oldCourseId,
        oldDeptId,
        newCourseId,
        newDeptId,
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

    const oldDept = await Department.findByPk(oldDeptId);
    if (!oldDept) {
      return res.status(404).json({
        successful: false,
        message: "Department not found.",
      });
    }

    const newCourse = await Course.findByPk(newCourseId);
    if (!newCourse) {
      return res.status(404).json({
        successful: false,
        message: "Course not found.",
      });
    }

    const newDept = await Department.findByPk(newDeptId);
    if (!newDept) {
      return res.status(404).json({
        successful: false,
        message: "Department not found.",
      });
    }

    const existingAssociation = await oldCourse.hasCourseDepts(oldDeptId);
    if (!existingAssociation) {
      return res.status(404).json({
        successful: false,
        message:
          "Association between the old course and old department does not exist.",
      });
    }

    const newExistingPairing = await newCourse.hasCourseDepts(newDeptId);
    if (newExistingPairing) {
      return res.status(400).json({
        successful: false,
        message: "New course is already associated with the new department.",
      });
    }

    await oldDept.removeDeptCourses(oldCourseId);
    await newDept.addDeptCourses(newCourseId);

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
  addCourse,
  getAllCourses,
  deleteCourse,
  getCourse,
  updateCourse,
  getCourseByProf,
  addDeptCourse,
  deleteDeptCourse,
  getCoursesByDept,
  updateDeptCourse,
};
