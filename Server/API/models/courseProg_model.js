
module.exports = function (sequelize, DataTypes) {
    const CourseProg = sequelize.define('CourseProg', {
        Year: {
            type: DataTypes.INTEGER,
            allowNull: true,
            max: 6,
            min: 1
        }
    }, {
        timestamps: true,
        indexes: [{
            name: 'CourseProgs_ProgramId_CourseId_index',
            unique: false,
            fields: ['CourseId', 'ProgramId'],
        }]
    })
    CourseProg.associate = (models) => {
        CourseProg.belongsTo(models.Course, {foreignKey: {name: 'CourseId', allowNull: false}})
        CourseProg.belongsTo(models.Program, {foreignKey: {name: 'ProgramId', allowNull: false}})
    };
    return CourseProg;
}

