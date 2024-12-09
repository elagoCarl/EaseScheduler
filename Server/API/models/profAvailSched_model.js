module.exports = (sequelize, DataTypes) => {
    const ProfAvailSched = sequelize.define('ProfAvailSched', {
        Start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        End_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
    },{
        timestamps: true
    })
    ProfAvailSched.associate = (models) => {
        ProfAvailSched.belongsTo(models.ProfAvail)
    }
    return ProfAvailSched
}