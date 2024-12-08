const { Course } = require('../models');
const util = require('../../utils');

const addCourse = async (req, res) => {
    try {
        let courses = req.body;

        // Ensure the request body is an array
        if (!Array.isArray(courses)) {
            courses = [courses];
        }

        for (const course of courses) {
            const { Code, Description, Duration, Units, Type } = course;

            // Validate mandatory fields
            if (!util.checkMandatoryFields([Code, Description, Duration, Units, Type])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            // Check if the course already exists
            const existingCourse = await Course.findOne({ where: { Code } });
            if (existingCourse) {
                return res.status(406).json({
                    successful: false,
                    message: `Course with code ${Code} already exists.`
                });
            }

            // Create the new course
            await Course.create({
                Code,
                Description,
                Duration,
                Units,
                Type
            });
        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new course(s)."
        });
    } 
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
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
              data: []
          });
      }

      return res.status(200).json({
          successful: true,
          message: "Retrieved all courses",
          count: courses.length,
          data: courses
      });
  } 
  catch (err) {
      return res.status(500).json({
          successful: false,
          message: err.message || "An unexpected error occurred."
      });
  }
};


const deleteCourse = async (req, res, next) => {
  try {
      const deleteCourse = await Course.destroy({
          where: {
            id: req.params.id, // Replace with the ID of the record you want to delete
          },
        })
      if (deleteCourse) {
          res.status(200).send({
              successful: true,
              message: "Successfully deleted course."
          })
      } else {
          res.status(400).send({
              successful: false,
              message: "Course not found."
          })
      }
  } catch (err) {
      res.status(500).send({
          successful: false,
          message: err.message
      });
  }
}


const getCourse = async (req, res, next) => {
  try {
      let prof = await Course.findByPk(req.params.id)
      

      if (!prof) {
          res.status(404).send({
              successful: false,
              message: "Course not found"
          });
      } else {
          res.status(200).send({
              successful: true,
              message: "Successfully retrieved Course.",
              data: prof
          });
      }
  }
  catch (err) {
      return res.status(500).json({
          successful: false,
          message: err.message || "An unexpected error occurred."
      })
  }
}

const updateCourse = async (req, res) => {
  try {
      // Find course by primary key
      const course = await Course.findByPk(req.params.id);
      const { Code, Description, Duration, Units, Type } = req.body;

      // Check if course exists
      if (!course) {
          return res.status(404).json({
              successful: false,
              message: "Course not found."
          });
      }

      // Validate mandatory fields
      if (!util.checkMandatoryFields([Code, Description, Duration, Units, Type])) {
          return res.status(400).json({
              successful: false,
              message: "A mandatory field is missing."
          });
      }

      // Validate that `Duration` and `Units` are positive integers
      if (Duration <= 0 || Units <= 0) {
          return res.status(406).json({
              successful: false,
              message: "Duration and Units must be positive integers."
          });
      }

      // Check for course code conflicts if it's being updated
      if (Code !== course.Code) {
          const codeConflict = await Course.findOne({ where: { Code } });
          if (codeConflict) {
              return res.status(406).json({
                  successful: false,
                  message: "Course code already exists. Please use a different code."
              });
          }
      }

      // Update course details
      await course.update({
          Code,
          Description,
          Duration,
          Units,
          Type
      });

      return res.status(201).json({
          successful: true,
          message: "Successfully updated course."
      });
  } 
  catch (err) {
      return res.status(500).json({
          successful: false,
          message: err.message || "An unexpected error occurred."
      });
  }
};



module.exports = { 
  addCourse,
  getAllCourses,
  deleteCourse,
  getCourse,
  updateCourse
 };
