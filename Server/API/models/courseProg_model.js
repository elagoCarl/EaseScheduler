
module.exports = function (sequelize, DataTypes) {
    const CourseProg = sequelize.define('CourseProg', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        Year: {
            type: DataTypes.INTEGER,
            allowNull: true,
            max: 6,
            min: 1
        }
    }, {
        timestamps: true,
    })
    CourseProg.associate = (models) => {
        CourseProg.belongsTo(models.Course, {foreignKey: {name: 'CourseId', allowNull: false}})
        CourseProg.belongsTo(models.Program, {foreignKey: {name: 'ProgramId', allowNull: false}})
    };
    return CourseProg;
}

