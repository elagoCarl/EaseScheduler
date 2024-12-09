module.exports = (sequelize, DataTypes) => {
    const Professor = sequelize.define('Professor', {
        Name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Name is required." }
            }
        },
        Email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: { msg: "Valid Email is required." },
                notEmpty: { msg: "Email is required." }
            }
        },
        Total_units: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 0,
            defaultValue: 0
        },
        Status: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Status is required." }
            }
        }
    }, {
        timestamps: true
    })
    Professor.associate = (models) => {
        Professor.belongsToMany(models.Course, {
            through: 'CourseProf',
            as: 'ProfCourses',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }),
        Professor.hasMany(models.ProfAvail, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }),
        Professor.belongsToMany(models.Course, { through: 'Assignation' }),
        Professor.belongsToMany(models.Department, { through: 'Assignation' }),
        Professor.hasMany(models.Assignation);
    }
    
    

    return Professor
}