//IMPORT ALL PACKAGE DEPENDENCIES
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const cors = require('cors');

//INITIALIZE EXPRESS APPLICATION AND STORE TO app
const app = express();

// Update CORS configuration to allow requests from both localhost and deployed frontend
app.use(cors({
  origin: ['http://localhost:5173', 'https://ease-scheduler.vercel.app', 'https://easescheduler.onrender.com'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));


//IMPORT ALL ROUTERS NEEDED
const profStatus_rtr = require('./API/routers/profStatus_rtr')
const account_rtr = require('./API/routers/account_rtr')
const prof_rtr = require('./API/routers/prof_rtr')
const room_rtr = require('./API/routers/room_rtr')
const dept_rtr = require('./API/routers/dept_rtr')
const course_rtr = require('./API/routers/course_rtr')
const historyLogs_rtr = require('./API/routers/historyLogs_rtr')
const accArchive_rtr = require('./API/routers/accArchive_rtr')
const program = require('./API/routers/program_rtr')
const progYrSec = require('./API/routers/progYrSec_rtr')
const profAvail = require('./API/routers/profAvail_rtr')
const schedule_rtr = require('./API/routers/schedule_rtr')
const assignation_rtr = require('./API/routers/assignation_rtr')
const settings_rtr = require('./API/routers/settings_rtr')
const authMiddleware_rtr = require('./API/routers/authMiddleware_rtr')
const roomType_rtr = require('./API/routers/roomType_rtr')
const courseProg_rtr = require('./API/routers/courseProg_rtr')
const schoolYear_rtr = require('./API/routers/schoolYear_rtr')
const profLoad_rtr = require('./API/routers/profLoad_rtr')

// para lang makita kung anong request sa console
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});



//TO LOG CLIENT REQUEST-RESPONSE DATA IN A DEV ENVIRONMENT
app.use(morgan('dev'));
app.use(express.json())
app.use(cookieParser());

//PARSE DATA THAT ARE URLENCODED
//content-type: application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));

//PARSE DATA THAT ARE IN JSON FORMAT
//content-type: application/json
app.use(bodyParser.json({ limit: "50mb" }));


//
// app.use((req, res, next)=>{
//     //The Access-Control-Allow-Origin response header indicates whether the response can be shared with requesting code from the given origin. See origin definition in the dictionary.json. In this case, the server allows all origin, whether it matches the origin of the server or not.
//     res.header("Access-Control-Allow-Origin", "*");


//     //The Access-Control-Allow-Headers response header is used in response to a preflight request which includes the Access-Control-Request-Headers to indicate which HTTP headers can be used during the actual request. In this case, the server allows all headers.
//     //See Access-Control-Request-Headers definition in the dictionary.
//     res.header("Access-Control-Allow-Headers", "*");

//     //This code checks if the request method is HTTP OPTIONS. The HTTP OPTIONS method requests permitted communication options for a given URL or server. 
//     if (req.method === 'OPTIONS'){

//         //This writes in the response header that these are the only allowed HTTP methods.
//         res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');

//         //IF THE request method allowed, then the server will respond an OK status.
//         return res.status(200).json({});
//     }
//     //THIS PASS THE NEXT CONTROL TO THE NEXT MIDDLEWARE
//     next();
// })

app.use((req, res, next) => {
  // Allow multiple origins
  const allowedOrigins = ['http://localhost:5173', 'https://ease-scheduler.vercel.app'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  // Allow specific headers
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Allow specific HTTP methods
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");

  // Allow credentials (cookies, authorization headers, etc.)
  res.header("Access-Control-Allow-Credentials", "true");

  // If the request method is OPTIONS, respond with 200 and the allowed methods
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  next();
});



//MIDDLEWARE FOR THE ROUTERS
app.use('/accounts', account_rtr)
app.use('/courseProg', courseProg_rtr)
app.use('/prof', prof_rtr)
app.use('/room', room_rtr)
app.use('/dept', dept_rtr)
app.use('/course', course_rtr)
app.use('/historyLogs', historyLogs_rtr)
app.use('/accArchive', accArchive_rtr)
app.use('/program', program)
app.use('/progYrSec', progYrSec)
app.use('/profAvail', profAvail)
app.use('/schedule', schedule_rtr)
app.use('/assignation', assignation_rtr)
app.use('/settings', settings_rtr)
app.use('/profStatus', profStatus_rtr)
app.use('/auth', authMiddleware_rtr)
app.use('/roomType', roomType_rtr)
app.use('/schoolYear', schoolYear_rtr)
app.use('/profLoad', profLoad_rtr)


//ERROR MIDDLEWARES
app.use((req, res, next) => {
  //THIS CODE CREATE A NEW ERROR OBJECT FOR UNKNOWN ENDPOINTS. MEANING, THE REQUEST DID NOT PROCEED WITH THE MIDDLEWARE ABOVE.

  const error = new Error('Not Found');
  error.status = 404;

  //THIS PASS THE NEXT CONTROL TO THE NEXT MIDDLEWARE ALONG WITH THE ERROR OBJECT THAT WAS CREATED.
  next(error);
});


app.use((error, req, res, next) => {
  //SENDS ERROR RESPONSE TO THE CLIENT. IF THE ERROR IS UNKNOWN ENDPOINT, THEN THIS WILL SEND ERROR RESPONSE WITH "NOT FOUND" MESSAGE AND 404 STATUS CODE. IF NOT, THEN IT WILL GET WHATEVER THE SYSTEM ENCOUNTERED.
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message
    }
  })
});

//EXPORTS THE EXPRESS APPLICATION SO THAT IT CAN BE IMPORTED FROM OTHE FILES.
module.exports = app;