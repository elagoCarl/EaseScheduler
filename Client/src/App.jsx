// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./Components/mainPage";
import LoginPage from "./Components/loginPage";
import Homepage from "./Components/homePage"
import AccountSettings from "./Components/accountSettings";
import CreateAccount from "./Components/createAccount";
import HistoryLogs from "./Components/historyLogs";
import Room from "./Components/room";
import Course from "./Components/course";
import ProfAvailability from "./Components/profAvailability";
import Professor from "./Components/professor";
import AssignSubjToProf from "./Components/assignSubjtoProf";
import AddConfigSchedule from "./Components/addConfigSchedule";
import OTPVerification from "./Components/otpVerification";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Define the route for MainPage */}
        <Route path="/" element={<MainPage />} />

        {/* Define the route for LoginPage */}
        <Route path="/loginPage" element={<LoginPage />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/accountSettings" element={<AccountSettings />} />
        <Route path="/createAccount" element={<CreateAccount />} />
        <Route path="/historyLogs" element={<HistoryLogs />} />
        <Route path="/room" element={<Room />} />
        <Route path="/profAvailability" element={<ProfAvailability />} />
        <Route path="/course" element={<Course />} />
        <Route path="/professor" element={<Professor />} />
        <Route path="/assignSubjtoProf" element={<AssignSubjToProf />} />
        <Route path="/addConfigSchedule" element={<AddConfigSchedule />} />
        <Route path="/otpVerification" element={<OTPVerification />} />
      </Routes>
    </Router>
  );
};

export default App;
