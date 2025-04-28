const { Department, Course, Room } = require('../models')
const jwt = require('jsonwebtoken')
const { REFRESH_TOKEN_SECRET } = process.env
const util = require('../../utils')
const { Op } = require('sequelize')
const { addHistoryLog } = require('../controllers/historyLogs_ctrl')

const addDept = async (req, res, next) => {
    try {
        let depts = req.body;

        // Check if the request body contains an array of professors
        if (!Array.isArray(depts)) {
            // If not an array, convert the single professor to an array 
            depts = [depts];
        }

        for (const dept of depts) {
            const { Name, isCore } = dept;

            if (!util.checkMandatoryFields([Name, isCore])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                })
            }


            const existingDept = await Department.findOne({
                where: {
                    Name: {
                        [Op.like]: Name
                    }
                }
            })
            if (existingDept) {
                return res.status(406).json({
                    successful: false,
                    message: "Department already exists."
                })
            }

            await Department.create({ Name, isCore })

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
            const page = 'Department';
            const details = `Added Department${Name}`;

            await addHistoryLog(accountId, page, details);

        }

        return res.status(201).json({
            successful: true,
            message: "Successfully added new department."
        })

    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getAllDept = async (req, res, next) => {
    try {
        let dept = await Department.findAll()
        if (!dept || dept.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No department found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all departments",
                count: dept.length,
                data: dept
            })
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getDept = async (req, res, next) => {
    try {
        let dept = await Department.findByPk(req.params.id);

        if (!dept) {
            res.status(404).send({
                successful: false,
                message: "Department not found"
            });
        } else {
            res.status(200).send({
                successful: true,
                message: "Successfully retrieved department.",
                data: dept
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

const deleteDept = async (req, res, next) => {
    try {

        const department = await Department.findOne({
            where: { id: req.params.id }
        })

        if (!department) {
            return res.status(400).send({
                successful: false,
                message: "Department not found."
            });
        }

        // Delete the course
        await Department.destroy({
            where: { id: req.params.id }
        });


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
        const page = 'Department';
        const details = `Deleted Department${department.Name}`;

        await addHistoryLog(accountId, page, details);

        if (deleteDept) {
            res.status(200).send({
                successful: true,
                message: "Successfully deleted department."
            })
        } else {
            res.status(400).send({
                successful: false,
                message: "Department not found."
            })
        }
    } catch (err) {
        res.status(500).send({
            successful: false,
            message: err.message
        });
    }
}

const updateDept = async (req, res, next) => {
    try {
        let dept = await Department.findByPk(req.params.id)
        const { Name, isCore } = req.body

        if (!dept) {
            res.status(404).send({
                successful: false,
                message: "Department not found"
            });
        }

        const existingDept = await Department.findOne({
            where: {
                id: { [Op.ne]: dept.id }, // Exclude the current department being updated
                Name: {
                    [Op.like]: Name
                }
            }
        })
        if (existingDept) {
            return res.status(406).json({
                successful: false,
                message: "Department already exists."
            });
        }

        if (!util.checkMandatoryFields([Name, isCore])) {
            return res.status(400).json({
                successful: false,
                message: "A mandatory field is missing."
            })
        }

        const updateDept = await dept.update({
            Name: Name,
            isCore: isCore
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
        const page = 'Department';
        const details = `Department Updated: Old; Name${dept.Name};;; New; Name:${Name}`;

        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: "Successfully updated department."
        })
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getDeptsByCourse = async (req, res, next) => {
    try {
        const courseId = req.params.id
        const depts = await Department.findAll({
            attributes: { exclude: ['DeptCourses'] },
            include: {
                model: Course,
                as: 'DeptCourses',
                where: {
                    id: courseId,
                },
                attributes: [],
                through: {
                    attributes: []
                }
            }
        })
        if (!depts || depts.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No department found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all department",
                count: depts.length,
                data: depts
            })
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}

const getDeptsByRoom = async (req, res, next) => {
    try {
        const roomId = req.params.id
        const depts = await Department.findAll({
            attributes: { exclude: ['DeptRooms'] }, // Exclude ProfCourses field
            include: {
                model: Room,
                as: 'DeptRooms',
                where: {
                    id: roomId,
                },
                attributes: [],
                through: {
                    attributes: []
                }
            }
        })
        if (!depts || depts.length === 0) {
            res.status(200).send({
                successful: true,
                message: "No department found",
                count: 0,
                data: []
            })
        }
        else {
            res.status(200).send({
                successful: true,
                message: "Retrieved all department",
                count: depts.length,
                data: depts
            })
        }
    }
    catch (err) {
        return res.status(500).json({
            successful: false,
            message: err.message || "An unexpected error occurred."
        })
    }
}
module.exports = {
    addDept,
    getAllDept,
    getDept,
    deleteDept,
    updateDept,
    getDeptsByCourse,
    getDeptsByRoom
};
