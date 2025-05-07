module.exports = (sequelize, DataTypes) => {
    const SchoolYear = sequelize.define('SchoolYear', {
        SY_Name: {
            type: DataTypes.STRING(9), // Adjusted to 9 characters because "2024-2025" is 9 chars
            unique: true,
            allowNull: false,
            validate: {
                is: /^[0-9]{4}-[0-9]{4}$/
            }
        },
    }, {
        timestamps: true
    });

    SchoolYear.associate = (models) => {
        SchoolYear.hasMany(models.ProfessorLoad, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
        SchoolYear.hasMany(models.Assignation, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return SchoolYear;
};