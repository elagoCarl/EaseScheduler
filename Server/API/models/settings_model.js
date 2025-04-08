module.exports = (sequelize, DataTypes) => {
    const Settings = sequelize.define('Settings', {
        StartHour: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 7, 
            validate: {
                min: 0,  
                max: 23  
            }
        },
        EndHour: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 21, 
            validate: {
                min: 1,  
                max: 24  
            }
        },

        // Professor's max hours of stay in school per day
        ProfessorMaxHours: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 12
        },

        // Student's max hours of stay in school per day
        StudentMaxHours: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 12
        },

        // Hours of break per continuous hours of schedule
        ProfessorBreak: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },

        // instead of studentBreak, we will enforce nextScheduleBreak which adds a break after every 
        // course
        
        // // Hours of break per continuous hours of schedule
        // StudentBreak: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     defaultValue: 1
        // },

        // remove the maxallowedgap and change it into nextScheduleBreak
        MaxAllowedGap : {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5
        },
        
        nextScheduleBreak: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0.5
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

    // Auto-create a single settings record if none exists after sync
    Settings.afterSync(async () => {
        const count = await Settings.count();
        if (count === 0) {
            await Settings.create({
                StartHour: 7,
                EndHour: 19,
                ProfessorMaxHours: 12,
                StudentMaxHours: 12,
                ProfessorBreak: 1,
                StudentBreak: 1
            });
        }
    });

    return Settings;
};