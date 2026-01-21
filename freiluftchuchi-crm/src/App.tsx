import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Kunden from './pages/Kunden';
import Projekte from './pages/Projekte';
import Zeiterfassung from './pages/Zeiterfassung';
import Rechnungen from './pages/Rechnungen';
import Buchungen from './pages/Buchungen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="kunden" element={<Kunden />} />
          <Route path="projekte" element={<Projekte />} />
          <Route path="zeiterfassung" element={<Zeiterfassung />} />
          <Route path="rechnungen" element={<Rechnungen />} />
          <Route path="buchungen" element={<Buchungen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
