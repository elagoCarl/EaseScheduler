module.exports = (sequelize, DataTypes) => {
    const Course = sequelize.define('Course', {
        Code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: { msg: "Course code is required." }
            }
        },
        Description: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Description is required." },
            }
        },
        Duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        },
        Units: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        },
        Type: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Course type is required." }
            }
        }
    }, {
        timestamps: true,
        hooks: {
            beforeDestroy: async (course, options) => {
                // Only proceed if the course has a PairId
                if (course.PairId) {
                    try {
                        // Find all other courses with the same PairId
                        const pairedCourses = await sequelize.models.Course.findAll({
                            where: {
                                PairId: course.PairId,
                                id: { [sequelize.Op.ne]: course.id } // Exclude the current course
                            },
                            transaction: options.transaction
                        });

                        // Delete all paired courses
                        for (const pairedCourse of pairedCourses) {
                            await pairedCourse.destroy({
                                transaction: options.transaction,
                                hooks: false // Important: prevent infinite loop
                            });
                        }

                        // Finally, delete the pair itself
                        await sequelize.models.Pair.destroy({
                            where: { id: course.PairId },
                            transaction: options.transaction
                        });
                    } catch (error) {
                        console.error('Error in Course beforeDestroy hook:', error);
                        throw error; // Propagate the error
                    }
                }
            }
        }
    });

    Course.associate = (models) => {
        // Add the pairing association
        Course.belongsTo(models.Pair, {
            onDelete: 'CASCADE',  // Changed to CASCADE for consistency
            onUpdate: 'CASCADE'
        });

        // Keep all existing associations
        Course.belongsToMany(models.Program, {
            through: { model: 'CourseProg', unique: false },
            foreignKey: 'CourseId',
            otherKey: 'ProgramId'
        }),
            Course.hasMany(models.CourseProg, {
                foreignKey: 'CourseId',
                as: 'CourseProgs',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }),
            Course.belongsTo(models.RoomType, {
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            }),
            Course.belongsToMany(models.Professor, {
                through: { model: 'Assignation', unique: false }
            }),
            Course.belongsToMany(models.Department, {
                through: 'DeptCourse',
                as: 'CourseDepts',
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }),
            Course.hasMany(models.Assignation, {
                foreignKey: 'CourseId'
            })
    };

    return Course;
};