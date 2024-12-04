const { account_model } = require('../models')

//wala ng password sa addAccount kasi tayo magbibigay ng default pass
//tas sila na magpapalit ng pass parang sa cares
const addAccount = (req, res, next) => {
  const { Name, Email, Role } = req.body;
  const Password = "CsitAdmin!12345"//default password

  if (!util.checkMandatoryFields([Name, Email, Role])) {
      return res.status(400).json({
          successful: false,
          message: "A mandatory field is missing."
      });
  }

  if (!util.validateEmail(Email)) {
      return res.status(406).json({
          successful: false,
          message: 'Invalid email format.'
      });
  }

  account_model.findOne({ Email: Email })
      .then(existingAccount => {
          if (existingAccount) {
              return res.status(406).json({
                  successful: false,
                  message: "Email already exists. Please use a different email."
              });
          }

          let acc = new account_model({
              Name: Name,
              Email: Email,
              Password: Password,
              Role: Role,
              verified: false
          });

          acc.save()
              .then((result) => {
                  //dito ilalagay yung verification email
                  console.log("Result object:", result);
                  sendOTPverificationEmail({ _id: result._id, email: result.Email }, res);
                  // res.status(201).json({
                  //     successful: true,
                  //     message: "Successfully added new account",
                  // });DITO
              })
              .catch((err) => {
                  res.status(400).json({
                      successful: false,
                      message: err.message
                  });
              });
      })
      .catch(err => {
          handleErrors(err);
          res.status(500).json({
              successful: false,
              message: err.message
          });
      });
};