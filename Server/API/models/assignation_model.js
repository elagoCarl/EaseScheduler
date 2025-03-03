module.exports = (sequelize, DataTypes) => {
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
        }
        // Note: No need to explicitly define foreign keys here if they're set up properly in associations
    }, {
        timestamps: true,
        indexes: [
            {
                name: 'assignation_unique_idx',
                unique: true,
                fields: ['School_Year', 'Semester', 'CourseId', 'ProfessorId', 'DepartmentId']
            }
            // No other unique indexes
        ]
    });
    
    Assignation.associate = (models) => {
        Assignation.belongsTo(models.Professor);
        Assignation.belongsTo(models.Course);
        Assignation.belongsTo(models.Department);
        Assignation.belongsToMany(models.Room, {through: 'Schedule'});
        Assignation.hasMany(models.Schedule, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };
    
    return Assignation;
};