module.exports = (sequelize, DataTypes) => {
    const Professor = require("./prof_model")(sequelize, DataTypes)
    const Department = require("./dept_model")(sequelize, DataTypes)
    const Course = require("./course_model")(sequelize, DataTypes)
    const Assignation = sequelize.define('Assignation', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        School_Year: {
            type: DataTypes.STRING,
            allowNull: false
        },  
        Semester: {
            type: DataTypes.STRING,
            allowNull: false
        },
        Block: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        timestamps: true
    });
    Professor.belongsToMany(Course, { through: Assignation });
    Course.belongsToMany(Professor, { through: Assignation });

    Professor.belongsToMany(Department, { through: Assignation });
    Department.belongsToMany(Professor, { through: Assignation });

    Course.belongsToMany(Department, { through: Assignation });
    Department.belongsToMany(Course, { through: Assignation });

    // Direct associations with Assignation
    Professor.hasMany(Assignation);
    Assignation.belongsTo(Professor);

    Course.hasMany(Assignation);
    Assignation.belongsTo(Course);

    Department.hasMany(Assignation);
    Assignation.belongsTo(Department);
    return Assignation
}