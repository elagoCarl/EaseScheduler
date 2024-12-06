const { Department } = require('../models')
const util = require('../../utils')

const addDept = async (req, res, next) => {
    try {
        let depts = req.body;

        // Check if the request body contains an array of professors
        if (!Array.isArray(depts)) {
            // If not an array, convert the single professor to an array
            depts = [depts];
        }

        for (const dept of depts) {
            const { Name } = dept;

            if (!util.checkMandatoryFields([Name])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing."
                })
            }

            const existingDept = await Department.findOne({ where: { Name } });
            if (existingDept) {
                return res.status(406).json({
                    successful: false,
                    message: "Department already exists."
                })
            }

            const newDept = await Department.create({
                Name: Name
            })
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
        if (!dept) {
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

module.exports = { addDept, getAllDept, getDept };
