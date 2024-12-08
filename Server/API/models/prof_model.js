module.exports = (sequelize, DataTypes) => {
    const Professor = sequelize.define('Professor', {
        Name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Name is required." }
            }
        },
        Email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: { msg: "Valid Email is required." },
                notEmpty: { msg: "Email is required." }
            }
        },
        Total_units: {
            type: DataTypes.INTEGER,
            allowNull: false,
            min: 0,
            defaultValue: 0
        },
        Status: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Status is required." }
            }
        }
    }, {
        timestamps: true
    });
    return Professor
}