// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./Components/mainPage";
import LoginPage from "./Components/loginPage";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Define the route for MainPage */}
        <Route path="/" element={<MainPage />} />

        {/* Define the route for LoginPage */}
        <Route path="/loginPage" element={<LoginPage />} />
      </Routes>
    </Router>
  );
};

export default App;
