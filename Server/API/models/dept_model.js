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
        }),
        Department.belongsToMany(models.Professor, { through: 'Assignation' }),
        Department.belongsToMany(models.Course, { through: 'Assignation' }),
        Department.hasMany(models.Assignation),
        Department.hasMany(models.Program, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }),
        Department.belongsToMany(models.Room, {
            through: 'DeptRoom',
            as: 'DeptRooms',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
    }

    return Department
}