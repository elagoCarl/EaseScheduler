module.exports = (sequelize, DataTypes) => {
    const Settings = sequelize.define('Settings', {
        StartHour: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 7, // Default Start Time is 7 AM
            validate: {
                min: 0,  // Cannot start before midnight (0:00)
                max: 23  // Cannot start after 11 PM (23:00)
            }
        },
        EndHour: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 19, // Default End Time is 7 PM
            validate: {
                min: 1,  // End hour should be at least after midnight (1:00)
                max: 24  // Cannot end after midnight (24:00)
            }
        }
    }, {
        timestamps: true
    });
    
// Hook to prevent multiple records
Settings.beforeCreate(async (settings, options) => {
    const count = await Settings.count();
    if (count > 0) {
        throw new Error("Only one settings record is allowed.");
    }
});

    return Settings;
};