import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import PatientLayout from './layouts/PatientLayout';
import NurseLayout from './layouts/NurseLayout';

// Landing & Login Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import Medication from './pages/patient/Medication';
import PatientInsight from './pages/patient/PatientInsight';
import DischargeInstructions from './pages/patient/DischargeInstructions';

// Nurse Pages
import NurseDashboard from './pages/nurse/NurseDashboard';
import PatientList from './pages/nurse/PatientList';
import PatientDetail from './pages/nurse/PatientDetail';
import MedicationAdherence from './pages/nurse/MedicationAdherence';
import AISummary from './pages/nurse/AISummary';
import Escalations from './pages/nurse/Escalations';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Landing & Authentication Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Patient Portal Routes */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<PatientDashboard />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="medication" element={<Medication />} />
          <Route path="insights" element={<PatientInsight />} />
          <Route path="discharge" element={<DischargeInstructions />} />
        </Route>

        {/* Nurse Portal Routes */}
        <Route path="/nurse" element={<NurseLayout />}>
          <Route index element={<NurseDashboard />} />
          <Route path="dashboard" element={<NurseDashboard />} />
          <Route path="patients" element={<PatientList />} />
          <Route path="patients/:id" element={<PatientDetail />} />
          <Route path="adherence" element={<MedicationAdherence />} />
          <Route path="ai-summary" element={<AISummary />} />
          <Route path="escalations" element={<Escalations />} />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
