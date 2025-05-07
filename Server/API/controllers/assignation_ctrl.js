const { Assignation, Course, Professor, Department, ProfStatus, RoomType, Room, ProgYrSec, CourseProg,SchoolYear, ProfessorLoad } = require('../models');
const jwt = require('jsonwebtoken');
const { REFRESH_TOKEN_SECRET } = process.env;
const { addHistoryLog } = require('../controllers/historyLogs_ctrl');
const { Op, ValidationError } = require('sequelize');
const util = require('../../utils');

const isExceedingUnitLimit = (Max_units, newTotalUnits) => {
    return newTotalUnits > (Max_units || 0);
}

const addAssignation = async (req, res, next) => {
    try {
        let assignations = req.body;

        if (!Array.isArray(assignations)) {
            assignations = [assignations];
        }

        let createdAssignations = [];
        let warningMessage = null;

        for (let assignation of assignations) {
            let { SchoolYearId, CourseId, ProfessorId, DepartmentId, SectionIds, Semester } = assignation;
            if (!util.checkMandatoryFields([SchoolYearId, CourseId, DepartmentId])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing.",
                });
            }

            // Validate SchoolYear
            const schoolYear = await SchoolYear.findByPk(SchoolYearId);
            if (!schoolYear) {
                return res.status(404).json({ successful: false, message: "School Year not found." });
            }

            // Validate Course
            const course = await Course.findByPk(CourseId,
                {
                    include: [
                        { model: CourseProg }
                    ]
                }
            );
            if (!course) {
                return res.status(404).json({ successful: false, message: "Course not found." });
            }

            // Check if tutorial course has sections
            if (course.isTutorial && SectionIds && SectionIds.length > 0) {
                return res.status(400).json({
                    successful: false,
                    message: "Tutorial courses cannot be assigned to sections.",
                });
            }

            // Validate Department
            const department = await Department.findByPk(DepartmentId);
            if (!department) {
                return res.status(404).json({ successful: false, message: "Department not found." });
            }

            // Validate Professor if provided
            let professor = null;
            if (ProfessorId) {
                professor = await Professor.findByPk(ProfessorId, {
                    include: [
                        { model: ProfAvail }  // Include professor's availability
                    ]
                });
                if (!professor) {
                    return res.status(404).json({ successful: false, message: "Professor not found." });
                }

                // Check professor's total availability against current and new assignations
                if (professor.ProfAvail && professor.ProfAvail.length > 0) {
                    // Calculate professor's total available hours
                    let totalAvailableMinutes = 0;

                    for (const avail of professor.ProfAvail) {
                        const startTime = new Date(`1970-01-01T${avail.Start_time}`);
                        const endTime = new Date(`1970-01-01T${avail.End_time}`);

                        // Calculate minutes between start and end time
                        const minutesDiff = (endTime - startTime) / (1000 * 60);
                        totalAvailableMinutes += minutesDiff;
                    }

                    // Convert available minutes to hours
                    const totalAvailableHours = totalAvailableMinutes / 60;

                    // Get all current assignations for this professor
                    const existingAssignations = await Assignation.findAll({
                        where: {
                            ProfessorId,
                            SchoolYearId  // Changed from School_year to SchoolYearId
                        },
                        include: [
                            {
                                model: Course,
                                attributes: ['Duration']
                            }
                        ]
                    });

                    // Calculate total duration of current assignations WITH 0.5 hours added to each
                    // Since Duration is in hours, we add 0.5 (30 minutes in hours)
                    let currentTotalHours = 0;
                    for (const existingAssign of existingAssignations) {
                        // Add course duration plus 0.5 hours for each existing assignation
                        currentTotalHours += (existingAssign.Course.Duration + 0.5);
                    }

                    // Add the duration of the new course WITH 0.5 hours added
                    const newTotalHours = currentTotalHours + (course.Duration + 0.5);

                    // Check if new total duration exceeds available time
                    if (newTotalHours > totalAvailableHours) {
                        return res.status(400).json({
                            successful: false,
                            message: `Professor ${professor.Name} doesn't have enough available time. Required: ${newTotalHours.toFixed(2)} hours, Available: ${totalAvailableHours.toFixed(2)} hours.`
                        });
                    }
                } else {
                    // If professor has no availability set, return error
                    return res.status(400).json({
                        successful: false,
                        message: `Professor ${professor.Name} has no availability set. Please set availability before assigning courses.`
                    });
                }
            }

            if (SectionIds && SectionIds.length > 0) {
                const sections = await ProgYrSec.findAll({
                    where: {
                        id: SectionIds
                    },
                    include: [
                        {
                            model: Program,
                        }
                    ]
                });

                // Check if all sections exist
                if (sections.length !== SectionIds.length) {
                    const foundIds = sections.map(section => section.id);
                    const invalidIds = SectionIds.filter(id => !foundIds.includes(id));

                    return res.status(404).json({
                        successful: false,
                        message: `One or more section IDs do not exist: ${invalidIds.join(', ')}`
                    });
                }

                // Get all program IDs from the sections
                const programIds = [...new Set(sections.map(section => section.Program.id))];

                // Find CourseProgs for this course and these programs
                const courseProgs = await CourseProg.findAll({
                    where: {
                        CourseId: CourseId,
                        ProgramId: programIds
                    }
                });

                // Check if the course can be assigned to all section programs AND year levels
                for (const section of sections) {
                    const programId = section.Program.id;
                    // Assuming ProgYrSec has a 'Year' field that represents the year level of the section
                    const sectionYear = section.Year;

                    // Find the CourseProgs that match both program and year
                    const courseProgForSection = courseProgs.find(cp =>
                        cp.ProgramId === programId &&
                        (cp.Year === sectionYear || cp.Year === null) // null Year in CourseProg means it's valid for any year
                    );

                    if (!courseProgForSection) {
                        return res.status(400).json({
                            successful: false,
                            message: `Course ${course.Code} cannot be assigned to section ${section.id} (Program: ${section.Program.Code}, Year: ${sectionYear}) as it's not configured for this program-year combination`
                        });
                    }
                }

                // Check if all sections are in the same semester
                if (courseProgs.length > 0) {
                    // Group the sections by their corresponding CourseProgs
                    const sectionCourseProgs = sections.map(section => {
                        const programId = section.Program.id;
                        const sectionYear = section.Year;

                        return courseProgs.find(cp =>
                            cp.ProgramId === programId &&
                            (cp.Year === sectionYear || cp.Year === null)
                        );
                    }).filter(cp => cp !== undefined); // Remove any undefined entries

                    if (sectionCourseProgs.length > 0) {
                        const firstSemester = sectionCourseProgs[0].Semester;
                        const allSameSemester = sectionCourseProgs.every(cp => cp.Semester === firstSemester);

                        if (!allSameSemester) {
                            return res.status(400).json({
                                successful: false,
                                message: "Cannot assign sections from different semesters to the same assignation."
                            });
                        }
                    }
                }

                const totalStudents = sections.reduce((acc, section) => acc + section.NumberOfStudents, 0);
                if (totalStudents > 50) {
                    return res.status(400).json({
                        successful: false,
                        message: "The total number of students in the sections exceeds 50."
                    });
                }
            }

            // Start a transaction for database operations
            const t = await sequelize.transaction();

            try {
                if (SectionIds && SectionIds.length > 0) {
                    // Check if any of these sections already have this course assigned
                    const sectionsWithSameCourse = await Assignation.findAll({
                        where: {
                            SchoolYearId, // Changed from School_year to SchoolYearId
                            CourseId
                        },
                        include: [
                            {
                                model: ProgYrSec,
                                where: {
                                    id: SectionIds
                                },
                                required: true
                            }
                        ],
                        transaction: t
                    });

                    if (sectionsWithSameCourse.length > 0) {
                        // Get the section details for the error message
                        const affectedSections = await ProgYrSec.findAll({
                            where: {
                                id: sectionsWithSameCourse.map(assign =>
                                    assign.ProgYrSecs.map(sec => sec.id)
                                ).flat()
                            },
                            include: [{ model: Program }],
                            transaction: t
                        });

                        const sectionDetails = affectedSections.map(section =>
                            `${section.Program.Code} ${section.Year}-${section.Section}`
                        ).join(', ');

                        await t.rollback();
                        return res.status(400).json({
                            successful: false,
                            message: `This course is already assigned to the following section(s): ${sectionDetails}`
                        });
                    }
                }

                // Update professor units through ProfessorLoad model
                if (professor && Semester) {
                    // Get professor's status to check unit limits
                    const status = await ProfStatus.findByPk(professor.ProfStatusId, {
                        transaction: t
                    });
                    
                    if (!status) {
                        await t.rollback();
                        return res.status(404).json({ successful: false, message: "Professor status not found." });
                    }

                    // Find or create the professor load record for this school year
                    let [professorLoad, created] = await ProfessorLoad.findOrCreate({
                        where: {
                            ProfId: professor.id,
                            SY_Id: SchoolYearId
                        },
                        defaults: {
                            First_Sem_Units: 0,
                            Second_Sem_Units: 0
                        },
                        transaction: t
                    });

                    const unitsToAdd = course.Units;
                    
                    if (Semester === 1) {
                        // Calculate new total units for first semester
                        const newTotalUnits = professorLoad.First_Sem_Units + unitsToAdd;

                        // Check if the total new units will exceed the limit
                        if (newTotalUnits > status.Max_units) {
                            // Instead of returning an error, set a warning message
                            warningMessage = `Professor ${professor.Name} is overloaded (${newTotalUnits}/${status.Max_units} units).`;
                        }

                        // Update professor's load with the new calculated value
                        await professorLoad.update({ First_Sem_Units: newTotalUnits }, {
                            transaction: t
                        });
                    } else if (Semester === 2) {
                        // Calculate new total units for second semester
                        const newTotalUnits = professorLoad.Second_Sem_Units + unitsToAdd;

                        // Check if the total new units will exceed the limit
                        if (newTotalUnits > status.Max_units) {
                            // Instead of returning an error, set a warning message
                            warningMessage = `Professor ${professor.Name} is overloaded (${newTotalUnits}/${status.Max_units} units).`;
                        }

                        // Update professor's load with the new calculated value
                        await professorLoad.update({ Second_Sem_Units: newTotalUnits }, {
                            transaction: t
                        });
                    }
                }

                // Create Assignation
                const assignationData = {
                    SchoolYearId, // Changed from School_year to SchoolYearId
                    CourseId,
                    DepartmentId
                };

                // Add ProfessorId if it was provided
                if (ProfessorId) {
                    assignationData.ProfessorId = ProfessorId;
                }

                const newAssignation = await Assignation.create(assignationData, {
                    transaction: t
                });

                if (SectionIds && SectionIds.length > 0) {
                    await newAssignation.setProgYrSecs(SectionIds, {
                        transaction: t
                    });
                }

                // Commit the transaction
                await t.commit();

                createdAssignations.push(newAssignation);
            } catch (error) {
                // Roll back transaction on error
                await t.rollback();
                throw error; // Re-throw to be caught by the outer try/catch
            }
        }

        // If no assignations were created, return an error
        if (createdAssignations.length === 0) {
            return res.status(400).json({
                successful: false,
                message: "No assignations were created. Check for missing fields or duplicates.",
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
        const page = 'Assignation';
        const details = `Added Assignation ID(s): ${createdAssignations.map(a => a.id).join(', ')}`;
        await addHistoryLog(accountId, page, details);

        return res.status(201).json({
            successful: true,
            message: `${createdAssignations.length} assignation(s) created successfully.`,
            data: createdAssignations,
            warning: warningMessage
        });

    } catch (err) {
        console.error("Error in addAssignation:", err);
        return res.status(500).json({
            successful: false,
            message: "An unexpected error occurred while creating assignations.",
            error: err.message,
        });
    }
};

// Update Assignation by ID
const updateAssignation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { School_year, CourseId, ProfessorId, DepartmentId } = req.body;
        let warningMessage = null;

        // Check mandatory fields - ProfessorId can be null based on the model
        if (!util.checkMandatoryFields([School_year, CourseId, DepartmentId])) {
            return res.status(400).json({ successful: false, message: "A mandatory field is missing." });
        }

        // Find Assignation
        const assignation = await Assignation.findByPk(id);
        if (!assignation) {
            return res.status(404).json({ successful: false, message: "Assignation not found." });
        }
        // Validate related models
        const course = await Course.findByPk(CourseId);
        if (!course) return res.status(404).json({ successful: false, message: "Course not found." })

        const department = await Department.findByPk(DepartmentId);
        if (!department) return res.status(404).json({ successful: false, message: "Department not found." });


        // Validate Professor if provided
        let professor = null;
        if (ProfessorId) {
            professor = await Professor.findByPk(ProfessorId);
            if (!professor) {
                return res.status(404).json({ successful: false, message: "Professor not found." });
            }
        }

        // Check if the assignation already exists
        const existingAssignation = await Assignation.findOne({
            where: {
                School_year,
                CourseId,
                DepartmentId,
                ProfessorId: ProfessorId || null,
                id: { [Op.ne]: id } // Exclude current assignation
            }
        });

        if (existingAssignation) {
            return res.status(400).json({
                successful: false,
                message: "An assignation with the same details already exists."
            });
        }

        // Get old course information if course is changing
        let oldCourse = null;
        if (assignation.CourseId !== CourseId) {
            oldCourse = await Course.findByPk(assignation.CourseId);
        }

        // Handle professor unit calculations
        let currentProfessorUnitChange = 0;

        // Get old professor if exists
        let oldProfessor = null;
        if (assignation.ProfessorId) {
            oldProfessor = await Professor.findByPk(assignation.ProfessorId);
        }

        // Unit calculation logic
        if (professor) {
            // If changing from null professor to a professor
            if (!assignation.ProfessorId) {
                currentProfessorUnitChange = course.Units;
            }
            // If changing to a new professor
            else if (assignation.ProfessorId !== ProfessorId) {
                // New professor gets additional units
                currentProfessorUnitChange = course.Units;
            }
            // If same professor but different course
            else if (assignation.CourseId !== CourseId && oldCourse) {
                // Remove old course units and add new course units
                currentProfessorUnitChange = course.Units - oldCourse.Units;
            }

            // Get professor's status to check unit limits
            const status = await ProfStatus.findByPk(professor.ProfStatusId);
            if (!status) {
                return res.status(404).json({ successful: false, message: "Professor status not found." });
            }

            // Calculate new total units for current professor
            const newTotalUnits = professor.Total_units + currentProfessorUnitChange;

            // Check if the total new units will exceed the limit for the new/current professor
            if (currentProfessorUnitChange > 0 && newTotalUnits > status.Max_units) {
                // Add warning message instead of blocking the update
                warningMessage = `Professor ${professor.Name} is overloaded (${newTotalUnits}/${status.Max_units} units).`;
            }

            // Update current professor's total units if needed
            if (currentProfessorUnitChange !== 0) {
                await professor.update({ Total_units: newTotalUnits });
            }
        }

        // Handle old professor units if professor is changing or being removed
        if (oldProfessor && (ProfessorId !== assignation.ProfessorId || ProfessorId === null)) {
            // Get old course
            const oldCourseForUnitCalc = oldCourse || course;

            // Update old professor's units
            const oldProfNewUnits = oldProfessor.Total_units - oldCourseForUnitCalc.Units;
            await oldProfessor.update({ Total_units: Math.max(0, oldProfNewUnits) });
        }

        // Update Assignation
        const updateData = {
            Semester,
            CourseId,
            DepartmentId,
        };

        // Add ProfessorId if it was provided (can be null)
        updateData.ProfessorId = ProfessorId;

        await assignation.update(updateData);

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
        const page = 'Assignation';
        const details = `Updated Assignation ID: ${id}, Course: ${CourseId}, Prof: ${ProfessorId || 'None'}`;
        await addHistoryLog(accountId, page, details);

        return res.status(200).json({
            successful: true,
            message: "Assignation updated successfully.",
            data: assignation,
            warning: warningMessage
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                successful: false,
                message: "Validation Error: One or more fields failed validation.",
                errors: error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                })),
            });
        }

        return res.status(500).json({
            successful: false,
            message: "An unexpected error occurred while updating the assignation.",
            error: error.message,
        });
    }
};

// Get a specific Assignation by ID
const getAssignation = async (req, res, next) => {
    try {
        const { id } = req.params;

        const assignation = await Assignation.findByPk(id, {
            include: [
                {
                    model: Course,
                    attributes: ['Code', 'Description', 'Units'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                { model: Professor, attributes: ['Name', 'Email', 'FirstSemUnits', 'SecondSemUnits'] },
                { model: Department, attributes: ['Name'] },
                {
                    model: RoomType,
                    attributes: ['id', 'Type']
                },
                {
                    model: ProgYrSec,
                    attributes: ['id', 'Year', 'Section'],
                    include: [
                        {
                            model: Program,
                            attributes: ['Code', 'Description']
                        }
                    ]
                }
            ],
        });

        if (!assignation) {
            return res.status(404).json({ successful: false, message: "Assignation not found." });
        }

        return res.status(200).json({
            successful: true,
            data: assignation,
        });
    } catch (error) {
        next(error);
    }
};

// Get all Assignations
const getAllAssignations = async (req, res, next) => {
    try {
        const assignations = await Assignation.findAll({
            include: [
                {
                    model: Course, attributes: ['Code', 'Description', 'Units'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                { model: Professor, attributes: ['Name', 'Email', 'FirstSemUnits', 'SecondSemUnits'] },
                { model: Department, attributes: ['Name'] },
                {
                    model: ProgYrSec,
                    attributes: ['id', 'Year', 'Section'],
                    include: [
                        {
                            model: Program,
                            attributes: ['Code', 'Description']
                        }
                    ]
                }
            ],
        });

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
        next(error);
    }
};

const getAllAssignationsByDept = async (req, res, next) => {
    try {
        const departmentId = req.params.id;
        if (!departmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department id is required.",
            });
        }

        const assignations = await Assignation.findAll({
            order: [['createdAt', 'DESC']],
            where: { DepartmentId: departmentId },
            include: [
                {
                    model: Course,
                    attributes: ['Code', 'Description', 'Units'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                {
                    model: ProgYrSec,
                    attributes: ['id', 'Year', 'Section'],
                    include: [
                        {
                            model: Program,
                            attributes: ['Code', 'Description']
                        }
                    ]
                }
            ]
        });

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
};

const getAllAssignationsByDeptInclude = async (req, res, next) => {
    try {
        const departmentId = req.params.id;
        if (!departmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department id is required.",
            });
        }
        console.log(`Fetching assignations for department ID: ${departmentId}`);
        
        // First, check if department exists
        const department = await Department.findByPk(departmentId);
        if (!department) {
            return res.status(404).json({
                successful: false,
                message: `Department with ID ${departmentId} not found`,
            });
        }
        
        const assignations = await Assignation.findAll({
            order: [['createdAt', 'DESC']],
            where: { DepartmentId: departmentId }
        });
        
        // If no assignations found, return empty array
        if (!assignations || assignations.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No assignations found for this department",
                data: [],
            });
        }
        
        const assignationsWithIncludes = await Assignation.findAll({
            order: [['createdAt', 'DESC']],
            where: { DepartmentId: departmentId },
            include: [
                {
                    model: Course, 
                    attributes: ['Code', 'Description', 'Units', 'Type', 'Duration'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                { 
                    model: Professor, 
                    attributes: ['Name', 'Email', 'FirstSemUnits', 'SecondSemUnits'] 
                },
                { 
                    model: Department, 
                    attributes: ['Name'] 
                },
                {
                    model: ProgYrSec,
                    attributes: ['id', 'Year', 'Section'],
                    include: [
                        {
                            model: Program,
                            attributes: ['Code', 'Description']
                        }
                    ]
                }
            ],
        });
        console.log(`Successfully retrieved ${assignationsWithIncludes.length} assignations with includes`);
        
        return res.status(200).json({
            successful: true,
            data: assignationsWithIncludes,
        });
    } catch (error) {
        console.error("Error in getAllAssignationsByDeptInclude:", error.message);
        console.error(error.stack);
        
        return res.status(500).json({
            successful: false,
            message: `Error retrieving assignations: ${error.message}`,
            error: error.stack
        });
    }
};

const deleteAssignation = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Start a transaction
        const t = await sequelize.transaction();

        try {
            // Find the assignation with related information
            const assignation = await Assignation.findByPk(id, {
                include: [
                    { 
                        model: Course, 
                        attributes: ['Units', 'isTutorial', 'id'] 
                    },
                    { 
                        model: Professor
                    },
                    {
                        model: ProgYrSec,
                        include: [{ model: Program }]
                    },
                    {
                        model: SchoolYear
                    }
                ],
                transaction: t
            });
            
            if (!assignation) {
                await t.rollback();
                return res.status(404).json({ 
                    successful: false, 
                    message: "Assignation not found." 
                });
            }

            // If the assignation has a professor and the course is not a tutorial,
            // decrease the professor's units in the ProfessorLoad model
            if (assignation.Professor && assignation.Course && !assignation.Course.isTutorial) {
                const unitsToDecrease = assignation.Course.Units;
                let semester
                
                // If no semester field directly on assignation, try to determine it from sections
                if (!semester && assignation.ProgYrSecs && assignation.ProgYrSecs.length > 0) {
                    // Get the first section's program and year
                    const section = assignation.ProgYrSecs[0];
                    
                    if (section && section.Program) {
                        // Find the course program entry for this combination
                        const courseProg = await CourseProg.findOne({
                            where: {
                                CourseId: assignation.Course.id,
                                ProgramId: section.Program.id,
                                Year: section.Year || null
                            },
                            transaction: t
                        });
                        
                        if (courseProg) {
                            semester = courseProg.Semester;
                        }
                    }
                }
                
                // If we found a semester, update the professor's units in ProfessorLoad
                if (semester && assignation.SchoolYear) {
                    // Find the professor's load record for this school year
                    const professorLoad = await ProfessorLoad.findOne({
                        where: {
                            ProfId: assignation.Professor.id,
                            SY_Id: assignation.SchoolYearId
                        },
                        transaction: t
                    });
                    
                    if (professorLoad) {
                        if (semester === 1) {
                            // Ensure we don't go below 0
                            const newUnits = Math.max(0, professorLoad.First_Sem_Units - unitsToDecrease);
                            await professorLoad.update({ 
                                First_Sem_Units: newUnits 
                            }, { transaction: t });
                        } else if (semester === 2) {
                            // Ensure we don't go below 0
                            const newUnits = Math.max(0, professorLoad.Second_Sem_Units - unitsToDecrease);
                            await professorLoad.update({ 
                                Second_Sem_Units: newUnits 
                            }, { transaction: t });
                        }
                    } else {
                        console.warn(`Professor load record not found for professor ${assignation.Professor.id} and school year ${assignation.SchoolYearId}`);
                    }
                } else {
                    // If we couldn't determine the semester or school year, log a warning
                    console.warn(`Could not determine semester or school year for assignation ${id} - units not decreased for professor ${assignation.Professor.id}`);
                }
            }

            // Delete the assignation
            await assignation.destroy({ transaction: t });
            
            // Commit the transaction
            await t.commit();

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
            const page = 'Assignation';
            const details = `Deleted Assignation ID: ${id}, Course: ${assignation.CourseId}, Prof: ${assignation.ProfessorId || 'None'}`;
            await addHistoryLog(accountId, page, details);

            return res.status(200).json({
                successful: true,
                message: "Assignation deleted successfully.",
            });
            
        } catch (error) {
            // Rollback transaction on error
            await t.rollback();
            throw error; // Re-throw to be caught by the outer try/catch
        }
    } catch (error) {
        console.error("Error in deleteAssignation:", error);
        return res.status(500).json({
            successful: false,
            message: "An unexpected error occurred while deleting the assignation.",
            error: error.message,
        });
    }
};

// Get assignments with room schedules
const getAssignationsWithSchedules = async (req, res, next) => {
    try {
        const assignations = await Assignation.findAll({
            include: [
                {
                    model: ProgYrSec,
                    attributes: ['id', 'Year', 'Section'],
                    include: [
                        {
                            model: Program,
                            attributes: ['Code', 'Description']
                        }
                    ]
                },
                {
                    model: Course, attributes: ['Code', 'Description', 'Units'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                { model: Professor, attributes: ['Name', 'Email', 'FirstSemUnits', 'SecondSemUnits'] },
                { model: Department, attributes: ['Name'] },
                {
                    model: Room,
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ],
                    through: {
                        attributes: ['Day', 'StartTime', 'EndTime']
                    }
                }
            ],
        });

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addAssignation,
    updateAssignation,
    getAssignation,
    getAllAssignations,
    deleteAssignation,
    getAllAssignationsByDept,
    getAllAssignationsByDeptInclude,
    getAssignationsWithSchedules
};