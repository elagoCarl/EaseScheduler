module.exports = (sequelize, DataTypes) => {
    const Course = require("./course_model")(sequelize, DataTypes)

    const Department = sequelize.define('Department', {
        Name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Department is required." }
            }
        }
    }, {
        timestamps: true
    });
    Course.belongsToMany(Department, { through: 'DeptCourse'})
    Department.belongsToMany(Course, {through: 'DeptCourse'})

    return Department
}