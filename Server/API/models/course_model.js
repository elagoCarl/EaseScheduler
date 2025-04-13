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
        },
        Year: {
            type: DataTypes.INTEGER,
            allowNull: false,
            max: 4,
            min: 1
        }
    }, {
        timestamps: true
    });

    Course.associate = (models) => {
        Course.belongsToMany(models.Program, {
            through: 'CourseProg',
            as: 'CourseProgs',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

        Course.belongsToMany(models.Professor, {
            through: models.Assignation,
            foreignKey: 'CourseId',
            uniqueKey: false
        });

        Course.belongsToMany(models.Department, {
            through: models.Assignation,
            as: 'CourseDepts',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            foreignKey: 'CourseId',
            uniqueKey: false
        });

        // New association for DeptCourse
        Course.belongsToMany(models.Department, {
            through: 'DeptCourse',
            as: 'DeptCourses',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });


        Course.hasMany(models.Assignation, {
            foreignKey: 'CourseId'
        });
    };

    return Course;
};
