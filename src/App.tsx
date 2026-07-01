import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MonoimeresPage from './pages/MonoimeresPage';
import KroyazieresPage from './pages/KroyazieresPage';
import RentalsPage from './pages/RentalsPage';
import ContactPage from './pages/ContactPage';
import { Navbar } from '@/components/layout/Navbar';

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">Μετάβαση στο περιεχόμενο</a>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/monoimeres" element={<MonoimeresPage />} />
        <Route path="/kroyazieres" element={<KroyazieresPage />} />
        <Route path="/pullman-rentals" element={<RentalsPage />} />
        <Route path="/epikoinonia" element={<ContactPage />} />
      </Routes>
    </>
  );
}
