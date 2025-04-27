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
        timestamps: true
    });

    Course.associate = (models) => {
        Course.belongsToMany(models.Program, {
            through: { model: 'CourseProg', unique: false},
            foreignKey: 'CourseId',
            otherKey: 'ProgramId'
        }),
        Course.hasMany(models.CourseProg, {
            foreignKey: 'CourseId',
            as: 'courseProgs',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }),
        Course.belongsTo(models.RoomType, {
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        }),
        Course.belongsToMany(models.Professor, {
            through: { model: 'Assignation', unique: false}
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
