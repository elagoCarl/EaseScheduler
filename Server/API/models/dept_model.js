module.exports = (sequelize, DataTypes) => {
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
    Department.associate = (models) => {
        Department.belongsToMany(models.Course, {
            through: 'DeptCourse',
            as: 'DeptCourses',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        // Change this relationship definition
        Department.belongsToMany(models.Professor, {
            through: models.Assignation,  // Use the model reference
            foreignKey: 'DepartmentId',
            uniqueKey: false
        });
        Department.belongsToMany(models.Course, {
            through: models.Assignation,  // Use the model reference
            foreignKey: 'DepartmentId',
            uniqueKey: false
        });
        Department.hasMany(models.Program, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        Department.belongsToMany(models.Room, {
            through: 'DeptRoom',
            as: 'DeptRooms',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        Department.hasMany(models.Assignation, {
            foreignKey: 'DepartmentId'
        });
    }

    return Department
}