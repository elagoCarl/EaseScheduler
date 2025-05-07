module.exports = (sequelize, DataTypes) => {
    const SchoolYear = sequelize.define('SchoolYear', {
        SY_Name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: { msg: "School Year Name is required." }
            }
        }
    }, {
        timestamps: true
    });

    SchoolYear.associate = (models) => {
        SchoolYear.hasMany(models.ProfessorLoad, {
            foreignKey: 'SY_Id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return SchoolYear;
};