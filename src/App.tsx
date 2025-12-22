import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Requisiciones from './pages/Requisiciones';
import Inspecciones from './pages/Inspecciones';
import InspectionCycleRooms from './pages/InspectionCycleRooms';
import InspectionRoomNew from './pages/InspectionRoomNew';
import InspectionRoomStandalone from './pages/InspectionRoomStandalone';
import InspectionRoomSummary from './pages/InspectionRoomSummary';
import InspectionIssues from './pages/InspectionIssues';
import InspectionAnalytics from './pages/InspectionAnalytics';
import QRScanner from './pages/QRScanner';
import Sabanas from './pages/Sabanas';
import Fumigacion from './pages/Fumigacion';
import FumigacionHabitaciones from './pages/FumigacionHabitaciones';
import FumigacionCicloDetail from './pages/FumigacionCicloDetail';
import FumigacionHabitacionCampo from './pages/FumigacionHabitacionCampo';
import FumigationQRScanner from './pages/FumigationQRScanner';
import FumigationStationFieldForm from './pages/FumigationStationFieldForm';
import FumigationRoomScanForm from './pages/FumigationRoomScanForm';
import FumigationExecutiveReport from './pages/FumigationExecutiveReport';
import Admin from './pages/Admin';
import Beos from './pages/Beos';
import BeosKiosk from './pages/BeosKiosk';
import SupervisorView from './pages/SupervisorView';
import ReportView from './pages/ReportView';
import WorkingOrders from './pages/WorkingOrders';
import WorkingOrderDetail from './pages/WorkingOrderDetail';
import WorkingOrdersAnalytics from './pages/WorkingOrdersAnalytics';
import WaterChemistry from './pages/WaterChemistry';
import WaterChemistryDetail from './pages/WaterChemistryDetail';
import WaterChemistryMap from './pages/WaterChemistryMap';
import ElementConfig from './pages/ElementConfig';
import AmenityLimitsAdmin from './pages/AmenityLimitsAdmin';
import SabanaPublica from './pages/SabanaPublica';
import Energy from './pages/Energy';
import EnergyForm from './pages/EnergyForm';
import EnergyDashboard from './pages/EnergyDashboard';
import EnergyForecast from './pages/EnergyForecast';
import EnergyForecastStandalone from './pages/EnergyForecastStandalone';
import EnergyPricing from './pages/EnergyPricing';
import RawDataView from './pages/RawDataView';
import MedalliaCalculatorStandalone from './pages/MedalliaCalculatorStandalone';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="requisiciones" element={<Requisiciones />} />
          <Route path="inspecciones" element={<Inspecciones />} />
          <Route path="inspecciones/ciclos/:cycleId" element={<InspectionCycleRooms />} />
          <Route path="inspecciones/ciclos/:cycleId/habitaciones/:roomId" element={<InspectionRoomNew />} />
          <Route path="inspecciones/ciclos/:cycleId/resumen/:roomId" element={<InspectionRoomSummary />} />
          <Route path="inspecciones/ciclos/:cycleId/analytics" element={<InspectionAnalytics />} />
          <Route path="inspecciones/pendientes" element={<InspectionIssues />} />
          <Route path="sabanas" element={<Sabanas />} />
          <Route path="fumigacion" element={<Fumigacion />} />
          <Route path="fumigacion/trampas" element={<Fumigacion />} />
          <Route path="fumigacion/habitaciones" element={<FumigacionHabitaciones />} />
          <Route path="fumigacion/ciclo/:id" element={<FumigacionCicloDetail />} />
          <Route path="fumigacion/habitaciones/campo/:cycleId" element={<FumigacionHabitacionCampo />} />
          <Route path="fumigacion/habitaciones/ciclo/:id" element={<FumigacionCicloDetail />} />
          <Route path="fumigacion/reporte" element={<FumigationExecutiveReport />} />
          <Route path="beos" element={<Beos />} />
          <Route path="working-orders" element={<WorkingOrders />} />
          <Route path="working-orders/:id" element={<WorkingOrderDetail />} />
          <Route path="working-orders/analytics" element={<WorkingOrdersAnalytics />} />
          <Route path="water-chemistry" element={<WaterChemistry />} />
          <Route path="water-chemistry/map" element={<WaterChemistryMap />} />
          <Route path="water-chemistry/:id" element={<WaterChemistryDetail />} />
          <Route path="water-chemistry/:id/config" element={<ElementConfig />} />
          <Route path="water-chemistry/amenity-limits" element={<AmenityLimitsAdmin />} />
          <Route path="energy" element={<Energy />} />
          <Route path="energy/form" element={<EnergyForm />} />
          <Route path="energy/raw-data" element={<RawDataView />} />
          <Route path="energy/dashboard" element={<EnergyDashboard />} />
          <Route path="energy/forecast" element={<EnergyForecast />} />
          <Route path="energy/pricing" element={<EnergyPricing />} />
                   <Route path="admin" element={<Admin />} />
        </Route>
        <Route path="/supervisor/:supervisorId" element={<SupervisorView />} />
        <Route path="/report" element={<ReportView />} />
        <Route path="/qr-scanner" element={<QRScanner />} />
        <Route path="/inspeccion/:cycleId/:roomId" element={<InspectionRoomStandalone />} />
        <Route path="/share-public-list-to/:sabanaId" element={<SabanaPublica />} />
        <Route path="/beos-kiosk" element={<BeosKiosk />} />
        <Route path="/energy-forecast-to-fin" element={<EnergyForecastStandalone />} />
        <Route path="/fumigacion/scanner" element={<FumigationQRScanner />} />
        <Route path="/fumigacion/estacion/:code" element={<FumigationStationFieldForm />} />
        <Route path="/fumigacion/habitacion/:cycleId/:roomNumber" element={<FumigationRoomScanForm />} />
        <Route path="/medallia-calculator" element={<MedalliaCalculatorStandalone />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
