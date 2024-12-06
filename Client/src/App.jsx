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
      </Routes>
    </Router>
  );
};

export default App;
