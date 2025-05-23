const { Assignation, Course, Professor, Department, ProfStatus, RoomType, Room, ProgYrSec, CourseProg, SchoolYear, ProfessorLoad, Program, ProfAvail, sequelize, Schedule } = require('../models');
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
            if (!util.checkMandatoryFields([SchoolYearId, CourseId, DepartmentId, Semester])) {
                return res.status(400).json({
                    successful: false,
                    message: "A mandatory field is missing.",
                });
            }

            // Validate Semester value
            if (Semester !== 1 && Semester !== 2) {
                return res.status(400).json({
                    successful: false,
                    message: "Semester must be either 1 or 2.",
                });
            }

            // Validate SchoolYear
            const schoolYear = await SchoolYear.findByPk(SchoolYearId);
            if (!schoolYear) {
                return res.status(404).json({ successful: false, message: "School Year not found." });
            }

            // Validate Course and check for paired courses
            const course = await Course.findByPk(CourseId, {
                include: [
                    { model: CourseProg, as: 'CourseProgs' },
                ]
            });

            if (!course) {
                return res.status(404).json({ successful: false, message: "Course not found." });
            }

            // Find all paired courses if this course has a PairId
            let pairedCourses = [];
            if (course.PairId) {
                pairedCourses = await Course.findAll({
                    where: {
                        PairId: course.PairId,
                        id: { [Op.ne]: course.id } // Exclude the current course
                    },
                    include: [
                        { model: CourseProg, as: 'CourseProgs' }
                    ]
                });
            }

            // Check tutorial course validation:
            // 1. Tutorial courses cannot have sections
            if (course.isTutorial && SectionIds && SectionIds.length > 0) {
                return res.status(400).json({
                    successful: false,
                    message: "Tutorial courses cannot be assigned to sections.",
                });
            }

            // 2. Non-tutorial courses MUST have sections
            if (!course.isTutorial && (!SectionIds || SectionIds.length === 0)) {
                return res.status(400).json({
                    successful: false,
                    message: "Non-tutorial courses must be assigned to at least one section.",
                });
            }

            // 3. Check for duplicate tutorial course assignation (for same professor)
            if (course.isTutorial && ProfessorId) {
                const existingTutorialAssignation = await Assignation.findOne({
                    where: {
                        SchoolYearId,
                        CourseId,
                        Semester,
                        ProfessorId
                    }
                });

                if (existingTutorialAssignation) {
                    return res.status(400).json({
                        successful: false,
                        message: `This tutorial course (${course.Code}) is already assigned to the same professor for School Year ID ${SchoolYearId} and Semester ${Semester}.`
                    });
                }
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
                        { model: ProfAvail },
                    ]
                });

                if (!professor) {
                    return res.status(404).json({ successful: false, message: "Professor not found." });
                }

                // Calculate total duration needed including all paired courses
                let totalCourseHours = course.Duration + 0.5; // Main course + buffer

                // Add duration of paired courses
                for (const pairedCourse of pairedCourses) {
                    totalCourseHours += pairedCourse.Duration + 0.5; // Each paired course + buffer
                }

                // Check professor's total availability against current and new assignations
                if (professor.ProfAvails && professor.ProfAvails.length > 0) {
                    // Calculate professor's total available hours
                    let totalAvailableMinutes = 0;

                    for (const avail of professor.ProfAvails) {
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
                            SchoolYearId,
                            Semester // Add Semester to check only relevant semester assignations
                        },
                        include: [
                            {
                                model: Course,
                                attributes: ['Duration']
                            }
                        ]
                    });

                    // Calculate total duration of current assignations WITH 0.5 hours added to each
                    let currentTotalHours = 0;
                    for (const existingAssign of existingAssignations) {
                        // Add course duration plus 0.5 hours for each existing assignation
                        currentTotalHours += (existingAssign.Course.Duration + 0.5);
                    }

                    // Add the duration of all new courses (main + paired) WITH 0.5 hours added
                    const newTotalHours = currentTotalHours + totalCourseHours;

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

                    // Check if the semester of the assignment matches the semester in the course program
                    if (courseProgForSection.Semester !== Semester) {
                        return res.status(400).json({
                            successful: false,
                            message: `Course ${course.Code} for program ${section.Program.Code} Year ${sectionYear} is offered in Semester ${courseProgForSection.Semester}, but you're trying to assign it to Semester ${Semester}.`
                        });
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
                // Check for duplicate assignations based on course type
                if (SectionIds && SectionIds.length > 0) {
                    // For non-tutorial courses, check for duplicate section assignments
                    // Check if these sections already have this course or any paired courses assigned
                    const allCourseIds = [CourseId, ...pairedCourses.map(pc => pc.id)];

                    // Find existing assignations for the given course, semester, and school year where any of the 
                    // requested sections are already assigned
                    const existingAssignations = await Assignation.findAll({
                        where: {
                            SchoolYearId,
                            CourseId: allCourseIds,
                            Semester
                        },
                        include: [
                            {
                                model: ProgYrSec,
                                required: true
                            }
                        ],
                        transaction: t
                    });

                    // Extract all section IDs from existing assignations
                    const existingSectionIds = new Set();
                    for (const assign of existingAssignations) {
                        for (const sec of assign.ProgYrSecs) {
                            existingSectionIds.add(sec.id);
                        }
                    }

                    // Check if any of the requested sections are already assigned
                    const duplicateSectionIds = SectionIds.filter(id => existingSectionIds.has(id));

                    if (duplicateSectionIds.length > 0) {
                        // Get section details for the error message
                        const duplicateSections = await ProgYrSec.findAll({
                            where: {
                                id: duplicateSectionIds
                            },
                            include: [{ model: Program }],
                            transaction: t
                        });

                        const sectionDetails = duplicateSections.map(section =>
                            `${section.Program.Code} ${section.Year}-${section.Section}`
                        ).join(', ');

                        await t.rollback();
                        return res.status(400).json({
                            successful: false,
                            message: `This course or one of its paired courses is already assigned to the following section(s): ${sectionDetails} for the same semester and school year.`
                        });
                    }
                }

                // Update professor units for all courses (main + paired)
                if (professor) {
                    // Get professor's status to check unit limits
                    const status = await ProfStatus.findByPk(professor.ProfStatusId, {
                        transaction: t
                    });

                    if (!status) {
                        await t.rollback();
                        return res.status(404).json({ successful: false, message: "Professor status not found." });
                    }

                    // Calculate total units including all paired courses
                    let totalUnits = course.Units;
                    for (const pairedCourse of pairedCourses) {
                        totalUnits += pairedCourse.Units;
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

                    if (Semester === 1) {
                        // Calculate new total units for first semester
                        const newTotalUnits = professorLoad.First_Sem_Units + totalUnits;

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
                        const newTotalUnits = professorLoad.Second_Sem_Units + totalUnits;

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

                // Create Assignation for the main course
                const assignationData = {
                    SchoolYearId,
                    CourseId,
                    DepartmentId,
                    Semester
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

                createdAssignations.push(newAssignation);

                // Create assignations for paired courses if they exist
                for (const pairedCourse of pairedCourses) {
                    // Check if paired course is tutorial and already has an assignation for this semester/school year with the same professor
                    if (pairedCourse.isTutorial && ProfessorId) {
                        const existingTutorialAssignation = await Assignation.findOne({
                            where: {
                                SchoolYearId,
                                CourseId: pairedCourse.id,
                                Semester,
                                ProfessorId
                            },
                            transaction: t
                        });

                        if (existingTutorialAssignation) {
                            // Skip this paired course as it already has an assignation with this professor
                            continue;
                        }
                    }

                    const pairedAssignationData = {
                        SchoolYearId,
                        CourseId: pairedCourse.id,
                        DepartmentId,
                        Semester
                    };

                    // Always use the same professor for paired courses
                    if (ProfessorId) {
                        pairedAssignationData.ProfessorId = ProfessorId;
                    }

                    const pairedAssignation = await Assignation.create(pairedAssignationData, {
                        transaction: t
                    });

                    // Only assign sections if the paired course is not a tutorial
                    if (SectionIds && SectionIds.length > 0 && !pairedCourse.isTutorial) {
                        await pairedAssignation.setProgYrSecs(SectionIds, {
                            transaction: t
                        });
                    }

                    createdAssignations.push(pairedAssignation);
                }

                // Commit the transaction
                await t.commit();
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
                            attributes: ['Code', 'Name']
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
        // Extract DepartmentId from URL parameters instead of request body
        const DepartmentId = req.params.id;
        const { SchoolYearId } = req.query; // If SchoolYearId is needed, get it from query params
        
        if (!DepartmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department id is required.",
            });
        }

        const department = await Department.findByPk(DepartmentId);
        if (!department) {
            return res.status(404).json({
                successful: false,
                message: `Department with ID ${DepartmentId} not found`,
            });
        }

        // Create the where clause conditionally based on whether SchoolYearId is provided
        const whereClause = { DepartmentId };
        if (SchoolYearId) {
            whereClause.SchoolYearId = SchoolYearId;
        }

        const assignations = await Assignation.findAll({
            order: [['createdAt', 'DESC']],
            where: whereClause,
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
                    attributes: ['Name', 'Email'],
                    include: [{ model: ProfessorLoad }]
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
                            attributes: ['Code', 'Name']
                        }
                    ]
                }
            ],
        });
        
        if (!assignations || assignations.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No assignations found for this department",
                data: [],
            });
        }

        return res.status(200).json({
            successful: true,
            data: assignations,
        });
    } catch (error) {
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
            // Fetch the assignation with all necessary associations
            const assignation = await Assignation.findByPk(id, {
                include: [
                    {
                        model: Course,
                        attributes: ['Units', 'isTutorial', 'id', 'PairId']
                    },
                    {
                        model: Professor
                    },
                    {
                        model: ProgYrSec, // This will include associated sections through the many-to-many relationship
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

            if (assignation.Professor && assignation.Course && !assignation.Course.isTutorial) {
                const unitsToDecrease = assignation.Course.Units;
                const semester = assignation.Semester; // Use the semester field directly from assignation

                // If we have a semester value, update the professor's units in ProfessorLoad
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
                        await t.rollback();
                        return res.status(400).json({
                            successful: false,
                            message: `Professor load record not found for professor ${assignation.Professor.Name} and school year ${assignation.SchoolYear.SY_Name}. Please create a load record before deleting assignation.`
                        });
                    }
                } else {
                    await t.rollback();
                    return res.status(400).json({
                        successful: false,
                        message: `Missing semester or school year for assignation ${id}. Cannot update professor load.`
                    });
                }
            }

            // Check if there are paired courses to delete
            if (assignation.Course && assignation.Course.PairId) {
                // Get the section IDs associated with this assignation
                const sectionIds = assignation.ProgYrSecs.map(section => section.id);
                
                // Find paired course assignations with the same professor, semester, school year
                const pairedCourseAssignations = await Assignation.findAll({
                    where: {
                        SchoolYearId: assignation.SchoolYearId,
                        ProfessorId: assignation.ProfessorId,
                        Semester: assignation.Semester,
                        id: { [Op.ne]: assignation.id } // Exclude the current assignation
                    },
                    include: [
                        {
                            model: Course,
                            where: {
                                PairId: assignation.Course.PairId
                            }
                        },
                        {
                            model: ProgYrSec // Include sections
                        }
                    ],
                    transaction: t
                });
                
                // Filter to only include assignations that have matching sections
                const matchingPairedAssignations = [];
                
                for (const pairedAssignation of pairedCourseAssignations) {
                    const pairedSectionIds = pairedAssignation.ProgYrSecs.map(section => section.id);
                    
                    // Check if the paired assignation has the exact same sections
                    // Both arrays should have the same length and contain the same section IDs
                    const hasSameSections = 
                        sectionIds.length === pairedSectionIds.length && 
                        sectionIds.every(id => pairedSectionIds.includes(id));
                    
                    if (hasSameSections) {
                        matchingPairedAssignations.push(pairedAssignation);
                    }
                }

                // Delete the paired assignations that match our criteria
                for (const pairedAssignation of matchingPairedAssignations) {
                    // Decrease professor units for paired courses if they're not tutorials
                    if (pairedAssignation.Course && !pairedAssignation.Course.isTutorial && assignation.Professor) {
                        const pairedUnitsToDecrease = pairedAssignation.Course.Units;

                        // Find the professor's load record for this school year
                        const professorLoad = await ProfessorLoad.findOne({
                            where: {
                                ProfId: assignation.Professor.id,
                                SY_Id: assignation.SchoolYearId
                            },
                            transaction: t
                        });

                        if (professorLoad) {
                            if (assignation.Semester === 1) {
                                // Ensure we don't go below 0
                                const newUnits = Math.max(0, professorLoad.First_Sem_Units - pairedUnitsToDecrease);
                                await professorLoad.update({
                                    First_Sem_Units: newUnits
                                }, { transaction: t });
                            } else if (assignation.Semester === 2) {
                                // Ensure we don't go below 0
                                const newUnits = Math.max(0, professorLoad.Second_Sem_Units - pairedUnitsToDecrease);
                                await professorLoad.update({
                                    Second_Sem_Units: newUnits
                                }, { transaction: t });
                            }
                        } else {
                            await t.rollback();
                            return res.status(400).json({
                                successful: false,
                                message: `Professor load record not found for paired course professor. Cannot update load for paired course deletion.`
                            });
                        }
                    }

                    // Delete the paired assignation
                    await pairedAssignation.destroy({ transaction: t });
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


const getSchedulableAssignationsByDept = async (req, res, next) => {
    try {
        // Extract DepartmentId from URL parameters
        const DepartmentId = req.params.id;
        const { SchoolYearId, Semester } = req.query; // Get SchoolYearId and Semester from query params
        
        if (!DepartmentId) {
            return res.status(400).json({
                successful: false,
                message: "Department id is required.",
            });
        }

        if (!SchoolYearId) {
            return res.status(400).json({
                successful: false,
                message: "School year id is required.",
            });
        }

        if (!Semester) {
            return res.status(400).json({
                successful: false,
                message: "Semester is required.",
            });
        }

        const department = await Department.findByPk(DepartmentId);
        if (!department) {
            return res.status(404).json({
                successful: false,
                message: `Department with ID ${DepartmentId} not found`,
            });
        }

        // Create the where clause with DepartmentId, SchoolYearId, and Semester
        const whereClause = { 
            DepartmentId,
            SchoolYearId,
            Semester
        };

        // Fetch all assignations matching the criteria
        const assignations = await Assignation.findAll({
            order: [['createdAt', 'DESC']],
            where: whereClause,
            include: [
                {
                    model: Course,
                    attributes: ['id', 'Code', 'Description', 'Units', 'Type', 'Duration', 'RoomTypeId'],
                    include: [
                        {
                            model: RoomType,
                            attributes: ['id', 'Type']
                        }
                    ]
                },
                {
                    model: Professor,
                    attributes: ['id', 'Name', 'Email'],
                    include: [{ model: ProfessorLoad }]
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
                            attributes: ['id', 'Code', 'Name']
                        }
                    ]
                },
                {
                    model: Schedule,
                    attributes: ['id', 'Day', 'Start_time', 'End_time', 'RoomId']
                }
            ],
        });
        
        if (!assignations || assignations.length === 0) {
            return res.status(200).json({
                successful: true,
                message: "No assignations found for this department",
                data: [],
            });
        }

        // Filter assignations to only include those that can be scheduled
        const schedulableAssignations = assignations.filter(assignation => {
            // Skip assignations without a course or duration
            if (!assignation.Course || !assignation.Course.Duration) {
                return false;
            }

            const courseDuration = assignation.Course.Duration;
            
            // Calculate already scheduled hours for this course
            let scheduledMinutes = 0;
            assignation.Schedules.forEach(schedule => {
                // Parse hours and minutes from time strings
                const [startHours, startMinutes] = schedule.Start_time.split(':').map(Number);
                const [endHours, endMinutes] = schedule.End_time.split(':').map(Number);
                
                // Convert to total minutes
                const startTotalMinutes = (startHours * 60) + startMinutes;
                const endTotalMinutes = (endHours * 60) + endMinutes;
                
                // Add duration in minutes
                scheduledMinutes += (endTotalMinutes - startTotalMinutes);
            });
            
            // Convert minutes to hours with decimal precision
            const scheduledHours = scheduledMinutes / 60;
            
            // Calculate remaining hours
            const remainingHours = courseDuration - scheduledHours;
            
            // Add remaining hours to the assignation object
            assignation.dataValues.remainingHours = remainingHours;
            assignation.dataValues.scheduledHours = scheduledHours;
            
            // Return true if there are still hours to schedule
            return remainingHours > 0.01; // Allow a small tolerance for floating point errors
        });

        return res.status(200).json({
            successful: true,
            data: schedulableAssignations,
        });
    } catch (error) {
        return res.status(500).json({
            successful: false,
            message: `Error retrieving schedulable assignations: ${error.message}`,
            error: error.stack
        });
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
    getAssignationsWithSchedules,
    getSchedulableAssignationsByDept
};