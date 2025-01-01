module.exports = (sequelize, DataTypes) => {
    const Settings = sequelize.define('Settings', {
        FullTimeMax: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        },
        PartTimeMax: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        },
        FixTermMax: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        },
        MaxCourseDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        },
        MaxBreakDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 1
        }
    }, {
        timestamps: true

    })
    
    return Settings
}