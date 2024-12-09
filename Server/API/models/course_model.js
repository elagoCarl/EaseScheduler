

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
        Course.belongsToMany(models.Professor, {
            through: 'CourseProf',
            as: 'CourseProfs',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }),
        Course.belongsToMany(models.Professor, { through: 'Assignation' }),
        Course.belongsToMany(models.Department, { through: 'Assignation' }),
        Course.hasMany(models.Assignation),
        Course.belongsToMany(models.Department, { 
            through: 'DeptCourse',
            as: 'CourseDepts',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
    }
    

    return Course
}