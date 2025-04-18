//LIST OF ALL UTILITY FUNCTIONS

//CHECKS IF THE ARGUMENT IS NULL OR NOT. RETURNS TRUE IF THE ARGUMENT IS NULL, OTHERWISE RETURNS FALSE.
const checkIfNull = (data) => {
  return (data == null || data === "null" || data === "" || (typeof data === 'string' && data.trim() === '') || (typeof data === "undefined"))
}

//CHECKS IF THE VALUE OF A MANDATORY FIELD IS NULL OR NOT. RETURNS TRUE IF ALL MANDATORY FIELDS ARE NOT NULL, OTHERWISE RETURNS FALSE.
const checkMandatoryFields = (arrs) => {
  let result = true

  arrs.forEach(el => {
    if (checkIfNull(el)) {
      result = false
    }
  });

  return result
}

const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// CHECKS IF THE GIVEN DAY IS VALID (CASE-INSENSITIVE)
const checkValidDay = (day) => {
  if (typeof day !== "string") return false; // Ensure input is a string
  return validDays.includes(day.charAt(0).toUpperCase() + day.slice(1).toLowerCase());
}

const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/i;


// const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&]{8,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

const validateEmail = (email) => {
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return passwordRegex.test(password);
};

module.exports = {
  checkIfNull,
  checkMandatoryFields,
  validateEmail,
  validatePassword,
  checkValidDay
}