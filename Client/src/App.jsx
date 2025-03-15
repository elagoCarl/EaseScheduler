import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import MainPage from "./Components/mainPage";
import LoginPage from "./Components/loginPage";
import Homepage from "./Components/homePage";
import AccountSettings from "./Components/accountSettings";
import CreateAccount from "./Components/createAccount";
import HistoryLogs from "./Components/historyLogs";
import Room from "./Components/room";
import Course from "./Components/course";
import ProfAvailability from "./Components/profAvailability";
import Professor from "./Components/professor";
import AddConfigSchedule from "./Components/addConfigSchedule";
import OTPVerification from "./Components/otpVerification";
import ForgotPass from "./Components/forgotPass";
import RoomTimetable from "./Components/roomTimetable";
import ProfTimetable from "./Components/profTimetable";
import SectionTimetable from "./Components/sectionTimetable";
import AccountList from "./Components/accountList";
import AssignationsCourseProf from "./Components/assignationsCourseProf";
import Page404 from "./Components/page404";
import Page403 from "./Components/page403";
import { AuthProvider } from "./Components/authContext";
import ProtectedRoute from "./Components/protectedRoute";
import AdminRoute from "./Components/adminRoute"; // import AdminRoute

const App = () => {
  return (
    <AuthProvider>
      <Router>
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

            {/* Wrap createAccount route with AdminRoute */}
            <Route
              path="/createAccount"
              element={
                <AdminRoute>
                  <CreateAccount />
                </AdminRoute>
              }
            />
            <Route path="/historyLogs" element={<HistoryLogs />} />
            <Route path="/room" element={<Room />} />
            <Route path="/profAvailability" element={<ProfAvailability />} />
            <Route path="/course" element={<Course />} />
            <Route path="/professor" element={<Professor />} />
            <Route path="/addConfigSchedule" element={<AddConfigSchedule />} />
            <Route path="/roomTimetable" element={<RoomTimetable />} />
            <Route path="/profTimetable" element={<ProfTimetable />} />
            <Route path="/sectionTimetable" element={<SectionTimetable />} />
            <Route path="/accountList" element={<AccountList />} />
            <Route path="/assignationsCourseProf" element={<AssignationsCourseProf />} />

            {/** ERROR handling routes */}
            <Route path="*" element={<Page404 />} />
            <Route path="/403" element={<Page403 />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
