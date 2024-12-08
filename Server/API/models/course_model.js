

module.exports = (sequelize, DataTypes) => {
    const Professor = require("./prof_model")(sequelize, DataTypes)
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
    Professor.belongsToMany(Course, { through: 'CourseProf'})
    Course.belongsToMany(Professor, {through: 'CourseProf'})

    return Course
}