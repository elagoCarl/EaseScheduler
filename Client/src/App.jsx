// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./Components/mainPage";
import LoginPage from "./Components/loginPage";
import Homepage from "./Components/homePage"
import AccountSettings from "./Components/accountSettings";

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
      </Routes>
    </Router>
  );
};

export default App;
