import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RecordingPage from "./pages/RecordingPage";
import ResultPage from "./pages/ResultPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recording" element={<RecordingPage />} />
        <Route path="/result/:resultId" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
