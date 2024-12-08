module.exports = (sequelize, DataTypes) => {
    const Professor = require("./prof_model")(sequelize, DataTypes);

    const ProfAvail = sequelize.define('ProfessorAvail', {
        Day: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Day is required." }
            }
        },
        ProfessorId: { // Adding the foreign key
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Professor,
                key: 'id' // Adjust the key if your primary key is named differently
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        }
    }, {
        timestamps: true
    });

    return ProfAvail;
};
