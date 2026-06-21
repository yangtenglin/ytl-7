import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartScreen from "@/components/StartScreen";
import GamePage from "@/pages/GamePage";
import ResultScreen from "@/components/ResultScreen";
import MeteorStormPage from "@/pages/MeteorStormPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/result" element={<ResultScreen />} />
        <Route path="/meteor-storm" element={<MeteorStormPage />} />
      </Routes>
    </Router>
  );
}
