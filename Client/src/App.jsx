import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import MainPage from "./Components/mainPage";
import LoginPage from "./Components/loginPage";
import Homepage from "./Components/homePage";
import AccountSettings from "./Components/accountSettings";
import CreateAccount from "./Components/createAccount";
import HistoryLogs from "./Components/historyLogs";
import Room from "./Components/room";
import Course from "./Components/course";
import AddConfigSchedule from "./Components/addConfigSchedule";
import OTPVerification from "./Components/otpVerification";
import ForgotPass from "./Components/forgotPass";
import RoomTimetable from "./Components/roomTimetable";
import ProfTimetable from "./Components/profTimetable";
import SectionTimetable from "./Components/sectionTimetable";
import AccountList from "./Components/accountList";
import Page404 from "./Components/page404";
import Page403 from "./Components/page403";
import { AuthProvider } from "./Components/authContext";
import ProtectedRoute from "./Components/protectedRoute";
import DeptProg from "./Components/deptProg";
import ProgYrSec from "./Components/progYrSec";
import Settings from "./Components/settings"
import ProfessorManagement from "./Components/professorManagement";


const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<MainPage />} />
          <Route path="/loginPage" element={<LoginPage />} />
          <Route path="/forgotPassPage" element={<ForgotPass />} />
          <Route path="/otpVerification" element={<OTPVerification />} />
          

          {/* Protected routes */}
          <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
            <Route path="/homepage" element={<Homepage />} />
            <Route path="/accountSettings" element={<AccountSettings />} />
            <Route path="/createAccount" element={<CreateAccount />} />
            <Route path="/historyLogs" element={<HistoryLogs />} />
            <Route path="/room" element={<Room />} />
            <Route path="/course" element={<Course />} />
            <Route path="/professorManagement" element={<ProfessorManagement />} />
            <Route path="/addConfigSchedule" element={<AddConfigSchedule />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/roomTimetable" element={<RoomTimetable />} />
            <Route path="/profTimetable" element={<ProfTimetable />} />
            <Route path="/sectionTimetable" element={<SectionTimetable />} />
            <Route path="/accountList" element={<AccountList />} />
            <Route path="/deptProg" element={<DeptProg />} />
            <Route path="/progYrSec" element={<ProgYrSec />} />

            {/* ERROR handling routes */}
            <Route path="*" element={<Page404 />} />
            <Route path="/403" element={<Page403 />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
