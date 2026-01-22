import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Kunden from './pages/Kunden';
import Projekte from './pages/Projekte';
import Zeiterfassung from './pages/Zeiterfassung';
import Rechnungen from './pages/Rechnungen';
import Buchungen from './pages/Buchungen';
import Auswertungen from './pages/Auswertungen';
import Jahresabschluss from './pages/Jahresabschluss';
import Produkte from './pages/Produkte';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="kunden" element={<Kunden />} />
          <Route path="projekte" element={<Projekte />} />
          <Route path="produkte" element={<Produkte />} />
          <Route path="zeiterfassung" element={<Zeiterfassung />} />
          <Route path="rechnungen" element={<Rechnungen />} />
          <Route path="buchungen" element={<Buchungen />} />
          <Route path="auswertungen" element={<Auswertungen />} />
          <Route path="jahresabschluss" element={<Jahresabschluss />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
