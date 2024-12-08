module.exports = (sequelize, DataTypes) => {
    const ProfAvail = require('./profAvail_model')(sequelize, DataTypes)

    const ProfAvailSched = sequelize.define('ProfAvailSchedule', {
        Start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        End_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        ProfessorAvailId: { // Foreign key for ProfessorAvail
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: ProfAvail, // Name of the target table
                key: 'id'               // Primary key in the target table
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    }, {
        timestamps: true
    });
    return ProfAvailSched
}