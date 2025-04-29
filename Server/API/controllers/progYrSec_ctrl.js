const { ProgYrSec, Program, Course } = require('../models');
const util = require('../../utils');
const { Op } = require('sequelize');
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env

// Add ProgYrSec (Single or Bulk)
const addProgYrSec = async (req, res, next) => {
    try {
        let progYrSecToAdd = req.body;

        // Turn to array for bulk processing
        if (!Array.isArray(progYrSecToAdd)) {
            progYrSecToAdd = [progYrSecToAdd];
        }

        // Iterate through the array and check required fields
        for (const progYrSecData of progYrSecToAdd) {
            let { Year, Section, ProgramId, NumberOfStudents } = progYrSecData;

            if (!NumberOfStudents) {
                NumberOfStudents = 0; // Default value if not provided
            }

            if (!util.checkMandatoryFields([Year, Section, ProgramId, NumberOfStudents])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                });
            }

            // Check if ProgramId exists in the Program table
            const program = await Program.findByPk(ProgramId);
            if (!program) {
                return res.status(404).json({
                    successful: false,
                    message: `Program with ID ${ProgramId} not found.`
                });
            }


            // Ensure Year and Section combination is unique for the same ProgramId
            const existingProgYrSec = await ProgYrSec.findOne({
                where: { Year, Section, ProgramId }
            })
            if (existingProgYrSec) {
                return res.status(406).json({
                    successful: false,
                    message: `ProgYrSec with Year ${Year} and Section ${Section} already exists for Program ID ${ProgramId}.`
                });
            }
            if (Year < 1 || Year > 6) {
                return res.status(400).json({
                    successful: false,
                    message: "Year must be between 1 and 6."
                })
            }
            const sectionRegex = /^[A-Z]$/
            if (!sectionRegex.test(Section)) {
                return res.status(400).json({
                    successful: false,
                    message: "Section must be a single uppercase letter from A to Z."
                });
            }
            if(NumberOfStudents <= 0 || NumberOfStudents > 60){
                return res.status(400).json({
                    successful: false,
                    message: "Number of Students must be greater than 0 or less than 60."
                });
            }
            // Create ProgYrSec record
            await ProgYrSec.create({ Year, Section, ProgramId, NumberOfStudents });

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
            const page = 'ProgYrSec';
            const details = `Added Program: ${program.Code}${Year}${Section}`;

            await addHistoryLog(accountId, page, details);
        }

        return res.status(200).json({
            successful: true,
            message: "Successfully added new ProgYrSec(s)."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

const getDepartmentProgYrSecs = async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { courseType } = req.query;
      
      // Find all programs under the current department
      const departmentPrograms = await Program.findAll({
        where: { DepartmentId: departmentId },
        attributes: ['id', 'Name']
      });
      
      const validProgramIds = departmentPrograms.map(prog => prog.id);
      
      // Create a mapping from program ID to program name
      const programNameMap = {};
      departmentPrograms.forEach(prog => {
        programNameMap[prog.id] = prog.Name;
      });
      
      let whereClause = {
        ProgramId: { [Op.in]: validProgramIds }
      };
      
      // If filtering by core courses, we need to find which sections have core courses
      if (courseType === 'Core') {
        // This is a simplified approach - you may need to adjust based on your data structure
        // Get all core courses for these programs
        const coreCourses = await Course.findAll({
          where: { Type: 'Core' }
        });
        
        if (coreCourses.length === 0) {
          return res.status(200).json({
            successful: true,
            message: "No core courses found for this department",
            sections: []
          });
        }
      }
      
      // Find all sections matching criteria
      const sections = await ProgYrSec.findAll({
        where: whereClause,
        attributes: ['id', 'ProgramId', 'Year', 'Section']
      });
      
      // Enhance sections with program names
      const enhancedSections = sections.map(section => ({
        id: section.id,
        ProgramId: section.ProgramId,
        ProgramName: programNameMap[section.ProgramId] || 'Unknown Program',
        Year: section.Year,
        Section: section.Section
      }));
      
      return res.status(200).json({
        successful: true,
        message: "Sections retrieved successfully",
        sections: enhancedSections
      });
      
    } catch (error) {
      console.error("Error fetching department sections:", error);
      return res.status(500).json({
        successful: false,
        message: error.message || "An unexpected error occurred."
      });
    }
  };

// Get a Single ProgYrSec by ID
const getProgYrSec = async (req, res, next) => {
    try {
        const { id } = req.params;

        const progYrSec = await ProgYrSec.findByPk(id, {
            include: { model: Program, attributes: ['id', 'Name', 'Code'] }
        });

        if (!progYrSec) {
            return res.status(404).json({
                successful: false,
                message: "ProgYrSec not found."
            });
        }

        return res.status(200).json({
            successful: true,
            data: progYrSec
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Get All ProgYrSec
const getAllProgYrSec = async (req, res, next) => {
    try {
        const progYrSecs = await ProgYrSec.findAll({
            include: { model: Program, attributes: ['id', 'Name', 'Code'] }
        });

        return res.status(200).json({
            successful: true,
            data: progYrSecs
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Update ProgYrSec by ID
const updateProgYrSec = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { Year, Section, ProgramId, NumberOfStudents } = req.body;

        if (!util.checkMandatoryFields([Year, Section, ProgramId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        // Set default value for NumberOfStudents if not provided
        let updatedNumberOfStudents = NumberOfStudents;
        if (updatedNumberOfStudents === undefined) {
            updatedNumberOfStudents = 0; // Default value if not provided
        }

        const progYrSec = await ProgYrSec.findByPk(id);
        if (!progYrSec) {
            return res.status(404).json({
                successful: false,
                message: "ProgYrSec not found."
            });
        }

        // Check if ProgramId exists in the Program table
        const program = await Program.findByPk(ProgramId);
        if (!program) {
            return res.status(404).json({
                successful: false,
                message: `Program with ID ${ProgramId} not found.`
            });
        }
        

        // Ensure Year and Section combination is unique for the same ProgramId
        const existingProgYrSec = await ProgYrSec.findOne({
            where: { Year, Section, ProgramId, id: { [Op.ne]: id } }
        });
        if (existingProgYrSec) {
            return res.status(406).json({
                successful: false,
                message: `ProgYrSec with Year ${Year} and Section ${Section} already exists for Program ID ${ProgramId}.`
            });
        }

        if(NumberOfStudents <= 0){
            return res.status(400).json({
                successful: false,
                message: "Number of Students must be greater than 0."
            });
        }

        // Save old values for logging
        const oldProgram = await Program.findByPk(progYrSec.ProgramId);
        const oldValues = {
            Year: progYrSec.Year,
            Section: progYrSec.Section,
            ProgramName: oldProgram ? oldProgram.Name : "Unknown",
            NumberOfStudents: progYrSec.NumberOfStudents
        };

        await progYrSec.update({
            Year,
            Section,
            ProgramId,
            NumberOfStudents: updatedNumberOfStudents
        });

        const newProgram = await Program.findByPk(ProgramId);

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
        const page = 'ProgYrSec';
        const details = `Updated ProgYrSec: Old; Year: ${oldValues.Year}, Section: ${oldValues.Section}, Program: ${oldValues.ProgramName}, Students: ${oldValues.NumberOfStudents};;; New; Year: ${Year}, Section: ${Section}, Program: ${newProgram ? newProgram.Name : "Unknown"}, Students: ${updatedNumberOfStudents}`;

        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: "ProgYrSec updated successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

// Delete ProgYrSec by ID
const deleteProgYrSec = async (req, res, next) => {
    try {
        const { id } = req.params;

        const progYrSec = await ProgYrSec.findByPk(id);
        if (!progYrSec) {
            return res.status(404).json({
                successful: false,
                message: "ProgYrSec not found."
            });
        }

        const oldProgram = await Program.findByPk(progYrSec.ProgramId);
        const oldprog = {
            ProgramName: oldProgram ? oldProgram.Name : "Unknown"
        };

        await progYrSec.destroy();

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
        const page = 'Schedules?';
        const details = `Deleted ProgYrSec record for: ${oldprog.ProgramName}${progYrSec.Year}${progYrSec.Section}`; // Include professor's name or other info

        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: "ProgYrSec deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred."
        });
    }
};

const getAllProgYrSecByProgram = async (req, res, next) => {
    try {
        const ProgramId = req.params.id
        const progYrSecs = await ProgYrSec.findAll({ where: { ProgramId } })
        if (!progYrSecs || progYrSecs.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No progYrSecs found.",
                count: 0,
                data: [],
            })
        }

        return res.status(200).json({
            successful: true,
            message: "Retrieved all progYrSecs.",
            count: progYrSecs.length,
            data: progYrSecs,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const getProgYrSecByDept = async (req, res, next) => {
    try {
        const pys = await ProgYrSec.findAll({
            attributes: ['id', 'Year', 'Section', 'ProgramId', 'NumberOfStudents'],
            include: [
                {
                    model: Program,
                    attributes: ['id', 'Code'],
                    where: { DepartmentId: req.params.id }
                }
            ],
            order: [['Year', 'ASC'],['Section', 'ASC']]
        });

        if (!pys || pys.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No ProgYrSec found",
                count: 0,
                data: []
            });
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all ProgYrSec",
                count: pys.length,
                data: pys
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

const getProgYrSecByCourse = async (req, res, next) => {
    try {
        const { CourseId, DepartmentId } = req.body
        if (!util.checkMandatoryFields([CourseId, DepartmentId])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            });
        }

        const course = await Course.findByPk(CourseId, {
            attributes: ['id', 'Year', 'Type'],
            include: [{
                model: Program,
                as: 'CourseProgs',
                attributes: ['id']
            }]
        });

        if (!course) {
            return res.status(404).json({
                successful: false,
                message: "Course not found."
            });
        }

        // Initialize whereCondition as an empty object
        let whereCondition = {};

        // Only filter by Year if course.Year is not null
        if (course.Year !== null) {
            whereCondition.Year = course.Year;

            // If the course type is Professional, add filtering by associated program IDs.
            if (course.Type === 'Professional') {
                const courseProgramIds = course.CourseProgs.map(prog => prog.id);
                whereCondition = {
                    ...whereCondition,
                    ProgramId: { [Op.in]: courseProgramIds }
                };
            }
        }

        const programInclude = {
            model: Program,
            attributes: ['id', 'Code'],
            // If departmentId is provided, filter programs by DepartmentId
            where: DepartmentId ? { DepartmentId: DepartmentId } : undefined
        };

        const pys = await ProgYrSec.findAll({
            where: whereCondition,
            attributes: ['Year', 'Section', 'ProgramId', 'id'],
            include: [programInclude]
        });

        if (!pys || pys.length === 0) {
            return res.status(200).send({
                successful: true,
                message: "No ProgYrSec found",
                count: 0,
                data: []
            });
        } else {
            return res.status(200).send({
                successful: true,
                message: "Retrieved all ProgYrSec",
                count: pys.length,
                data: pys
            });
        }
    } catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        });
    }
}



module.exports = {
    addProgYrSec,
    getProgYrSec,
    getAllProgYrSec,
    updateProgYrSec,
    deleteProgYrSec,
    getAllProgYrSecByProgram,
    getProgYrSecByDept,
    getProgYrSecByCourse,
    getDepartmentProgYrSecs
};
