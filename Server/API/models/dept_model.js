module.exports = (sequelize, DataTypes) => {
    const Department = sequelize.define('Department', {
        Name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Department is required." }
            }
        },
        isCore: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
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
            through: { model: 'Assignation', unique: false }
        });
        Department.belongsToMany(models.Course, {
            through: { model: 'Assignation', unique: false }
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
        Department.hasMany(models.Account, {
            foreignKey: 'DepartmentId',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });
    }

    return Department
}