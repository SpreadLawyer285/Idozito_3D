import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import TimerPage from "./pages/TimerPage";

// Oldalváltáskor a tetejére ugrik (a landing görgetés-alapú, így fontos)
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/timer" element={<TimerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
