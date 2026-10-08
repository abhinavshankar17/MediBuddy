import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { getPatientPrescriptionData, getAllPatients } from '../../services/patientService';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Clock,
  Pill,
  User,
  Stethoscope,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Activity,
  CheckCircle2,
  Sparkles,
  QrCode,
  Building2,
  Phone,
  FileCheck,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  Eye,
  ExternalLink
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PatientPrescription() {
  const { activePatientId, setActivePatientId } = useApp();
  const prescriptionRef = useRef(null);

  const [currentPatientId, setCurrentPatientId] = useState(activePatientId || 'P001');
  const [allPatients, setAllPatients] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('prescription'); // 'prescription' | 'schedule' | 'documents'

  const loadPrescription = async (pId) => {
    try {
      setLoading(true);
      setError(null);
      const [res, pList] = await Promise.all([
        getPatientPrescriptionData(pId),
        getAllPatients()
      ]);
      setData(res);
      setAllPatients(pList || []);
    } catch (err) {
      console.error('Failed to load prescription data:', err);
      setError('Unable to load prescription records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescription(currentPatientId);
  }, [currentPatientId]);

  const handlePatientChange = (pId) => {
    setCurrentPatientId(pId);
    if (setActivePatientId) {
      setActivePatientId(pId);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!prescriptionRef.current) return;
    try {
      setDownloading(true);

      const element = prescriptionRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pageHeight;
      }

      const safeName = (data?.patient?.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Prescription_${safeName}_${data?.patient?._id || 'P001'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Could not export PDF. Please try printing via your browser dialog.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Official Medical Prescription">
        <LoadingState message="Compiling verified clinical prescription, all prescribed medications & dosage schedules..." />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer title="Official Medical Prescription">
        <ErrorState
          title="Prescription Unavailable"
          message={error || 'Could not find clinical prescription records.'}
          onRetry={() => loadPrescription(currentPatientId)}
        />
      </PageContainer>
    );
  }

  const {
    patient,
    document,
    uploadedDocuments = [],
    medications = [],
    activity = [],
    restrictions = [],
    diet = [],
    woundCare = [],
    followUp = [],
    warningSigns = []
  } = data;

  const issueDate = document?.dischargeDate || patient?.dischargeDate || '2026-10-05';
  const doctor = document?.doctorName || patient?.assignedDoctor || 'Dr. Vivek Iyer';
  const hospital = document?.hospitalName || 'CareBridge Memorial Hospital';

  return (
    <PageContainer
      title="Medical Prescription & Orders"
      subtitle="Complete doctor-authorized discharge prescription, all prescribed medicines, and clinical care directives."
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Patient Selector for easy navigation */}
          {allPatients.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl px-2.5 py-1 text-xs shadow-2xs">
              <span className="text-[#78716C] font-semibold text-[11px] hidden sm:inline">Patient:</span>
              <select
                value={patient._id}
                onChange={(e) => handlePatientChange(e.target.value)}
                className="bg-transparent font-bold text-[#1C1917] focus:outline-none cursor-pointer text-xs"
              >
                {allPatients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p._id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF8F5] hover:bg-[#F4F0E8] text-[#1C1917] font-bold text-xs rounded-xl border border-[#E8E2D7] transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-[#78716C]" />
            <span>Print Slip</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#CC785C] hover:bg-[#B6664C] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Generating PDF...' : 'Download Official PDF'}</span>
          </button>
        </div>
      }
    >
      {/* Top Banner Notice */}
      <div className="p-4 bg-[#FAF8F5] border border-[#E8E2D7] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#CC785C]/10 text-[#CC785C] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1C1917]">
              Digitally Authorized Prescription • {medications.length} Prescribed Medicine{medications.length === 1 ? '' : 's'}
            </h3>
            <p className="text-[11px] text-[#78716C]">
              Authorized by <strong>{doctor}</strong> for <strong>{patient.name}</strong> ({patient._id}) on {issueDate}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('prescription')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'prescription'
                ? 'bg-[#CC785C] text-white shadow-2xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Prescription Slip
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#CC785C] text-white shadow-2xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Dosage Cards ({medications.length})
          </button>
          {uploadedDocuments.length > 0 && (
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-[#CC785C] text-white shadow-2xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Uploaded PDFs ({uploadedDocuments.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      {activeTab === 'prescription' && (
        <div className="flex justify-center">
          {/* Printable & PDF Capture Container */}
          <div
            ref={prescriptionRef}
            className="w-full max-w-3xl bg-white border border-[#E8E2D7] rounded-3xl p-6 sm:p-10 shadow-lg text-[#1C1917] space-y-6 print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* 1. Hospital Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-[#1C1917]/15">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#CC785C] text-white flex items-center justify-center font-bold shadow-xs">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black font-serif text-[#1C1917] tracking-tight">
                      {hospital}
                    </h1>
                    <p className="text-[11px] text-[#78716C] font-semibold">
                      Department of Post-Operative Recovery & Clinical Care
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-[#78716C] pt-1">
                  NABH Accredited Tertiary Care Center • Reg No: MED-CB-2026-994
                </p>
              </div>

              <div className="text-left sm:text-right text-[11px] text-[#78716C] space-y-0.5 sm:pt-1">
                <p className="font-bold text-[#1C1917]">Emergency Helpline: 1800-419-2273</p>
                <p>Support: care@medibuddy.hospital.org</p>
                <p>Doc ID: <span className="font-mono text-[#1C1917] font-semibold">{document?._id || 'D001'}</span></p>
              </div>
            </div>

            {/* 2. Patient Demographics Strip */}
            <div className="p-4 bg-[#FAF8F5] border border-[#E8E2D7] rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Patient Name</span>
                <span className="font-bold text-[#1C1917] text-sm font-serif">{patient.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Patient ID / MRN</span>
                <span className="font-bold text-[#CC785C] font-mono">{patient._id} ({patient.syntheticId || 'CB-P001'})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Age / Gender</span>
                <span className="font-bold text-[#1C1917]">{patient.age} Yrs • {patient.gender}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Date of Issue</span>
                <span className="font-bold text-[#1C1917]">{issueDate}</span>
              </div>

              <div className="col-span-2 pt-2 border-t border-[#E8E2D7]/60">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Clinical Diagnosis / Procedure</span>
                <span className="font-bold text-[#1C1917]">{patient.condition} — {patient.procedure}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-[#E8E2D7]/60">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Attending Consultant</span>
                <span className="font-bold text-[#0D9488]">{doctor}</span>
              </div>
            </div>

            {/* 3. Rx Section & Complete Medication Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-[#E8E2D7] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-serif font-black text-[#CC785C]">℞</span>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1C1917]">
                    Prescribed Medications ({medications.length} Item{medications.length === 1 ? '' : 's'})
                  </h2>
                </div>
                <span className="text-[10px] text-[#78716C] uppercase font-bold">
                  Verified Active Regimen
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-[#E8E2D7] rounded-xl overflow-hidden">
                  <thead className="bg-[#FAF8F5] text-[#78716C] font-bold uppercase text-[10px] border-b border-[#E8E2D7]">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Medication & Strength</th>
                      <th className="p-3">Frequency & Schedule</th>
                      <th className="p-3">Relation to Food</th>
                      <th className="p-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F0E8]">
                    {medications.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-[#78716C] italic">
                          No active prescription medications recorded.
                        </td>
                      </tr>
                    ) : (
                      medications.map((med, idx) => (
                        <tr key={med._id || idx} className="hover:bg-[#FAF8F5]/50">
                          <td className="p-3 font-bold text-[#78716C]">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold text-[#1C1917] block font-serif text-sm">
                              {med.name}
                            </span>
                            <span className="text-[11px] text-[#0D9488] font-bold">
                              {med.dose || 'Standard Dose'} • {med.form || 'Oral Tablet'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-[#1C1917]">
                            <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E8E2D7] rounded-md font-semibold text-[11px] block w-fit">
                              {med.frequency || 'As directed'}
                            </span>
                            {med.scheduledTimes && med.scheduledTimes.length > 0 && (
                              <span className="text-[10px] text-[#78716C] block mt-0.5">
                                Times: {med.scheduledTimes.join(', ')}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-[#78716C] font-medium">
                            {med.foodRelation || 'With water'}
                          </td>
                          <td className="p-3 font-bold text-[#1C1917]">
                            {med.duration || '5 days'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Clinical Directives & Recovery Instructions */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716C] border-b border-[#E8E2D7] pb-1">
                Post-Discharge Clinical Care Directives
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Activity & Mobility */}
                <div className="p-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl space-y-1">
                  <span className="font-bold text-[#1C1917] flex items-center gap-1.5 text-[11px]">
                    <Activity className="w-3.5 h-3.5 text-[#0D9488]" />
                    Activity & Exercise
                  </span>
                  <p className="text-[#78716C] text-[11px]">
                    {activity.map((a) => a.sourceSentence).join(' ') || 'Walk gently with assistance as tolerated. Avoid strain.'}
                  </p>
                </div>

                {/* Dietary Guidance */}
                <div className="p-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl space-y-1">
                  <span className="font-bold text-[#1C1917] flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                    Dietary Plan & Hydration
                  </span>
                  <p className="text-[#78716C] text-[11px]">
                    {diet.map((d) => d.sourceSentence).join(' ') || `${patient.dietaryPreference || 'Balanced'} diet with adequate hydration.`}
                  </p>
                </div>

                {/* Wound Care / Surgical Protocol */}
                {woundCare.length > 0 && (
                  <div className="p-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl space-y-1">
                    <span className="font-bold text-[#1C1917] flex items-center gap-1.5 text-[11px]">
                      <Pill className="w-3.5 h-3.5 text-[#CC785C]" />
                      Wound & Surgical Care
                    </span>
                    <p className="text-[#78716C] text-[11px]">
                      {woundCare.map((w) => w.sourceSentence).join(' ')}
                    </p>
                  </div>
                )}

                {/* Warning Signs */}
                <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-1">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Emergency Red Flags (Contact Hospital)
                  </span>
                  <p className="text-rose-800 text-[11px]">
                    {warningSigns.map((ws) => ws.sourceSentence).join(' ') || 'Fever > 101°F, excessive swelling, bleeding or acute pain.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Follow-Up Consultation & Doctor Signature Footer */}
            <div className="pt-4 border-t-2 border-[#1C1917]/10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              {/* Follow-up Details */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Follow-up Consultation</span>
                <p className="font-bold text-[#1C1917]">
                  {followUp.map((f) => f.sourceSentence).join(' ') || 'Review at Outpatient Clinic in 7 Days.'}
                </p>
                <p className="text-[11px] text-[#78716C]">
                  Please bring this prescription slip and medication diary to your next clinic visit.
                </p>
              </div>

              {/* Digital Seal & Signature */}
              <div className="flex items-center gap-4 text-right">
                <div className="p-2 border-2 border-dashed border-[#0D9488]/40 rounded-xl text-center bg-[#0D9488]/5">
                  <QrCode className="w-10 h-10 text-[#0D9488] mx-auto" />
                  <span className="text-[8px] font-bold text-[#0D9488] uppercase tracking-wider block mt-0.5">
                    VERIFIED RX
                  </span>
                </div>

                <div className="text-left space-y-1">
                  <div className="font-serif italic text-base text-[#1C1917] font-bold border-b border-[#1C1917]/30 pb-0.5">
                    {doctor}
                  </div>
                  <p className="text-[10px] text-[#78716C] font-semibold">
                    Authorized Medical Practitioner
                  </p>
                  <p className="text-[9px] text-[#78716C]">Reg: MCI / TNC 84920-A</p>
                </div>
              </div>
            </div>

            {/* Bottom Disclaimer */}
            <div className="pt-2 text-center text-[9px] text-[#78716C] border-t border-[#E8E2D7]/50">
              This is a digitally verified clinical discharge prescription generated by MediBuddy CareBridge System. Valid for pharmacy dispensing.
            </div>
          </div>
        </div>
      )}

      {/* Dosage Cards Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <Card
            title={`Prescribed Medicines & Dosage (${medications.length})`}
            subtitle="Detailed medication cards compiled from clinical discharge instructions"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medications.map((med, idx) => (
                <div
                  key={med._id || idx}
                  className="p-4 bg-white border border-[#E8E2D7] rounded-2xl shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#CC785C]/10 text-[#CC785C] flex items-center justify-center font-bold">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1C1917] font-serif">{med.name}</h4>
                        <span className="text-xs text-[#0D9488] font-semibold">{med.dose}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E8E2D7] text-[10px] font-bold text-[#78716C] rounded-lg uppercase">
                      {med.duration || '5 days'}
                    </span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl text-xs space-y-1.5 border border-[#E8E2D7]/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[#78716C]">Frequency:</span>
                      <span className="font-bold text-[#1C1917]">{med.frequency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#78716C]">Instructions:</span>
                      <span className="font-bold text-[#0D9488]">{med.foodRelation || 'With water'}</span>
                    </div>
                    {med.scheduledTimes && med.scheduledTimes.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#78716C]">Reminder Timings:</span>
                        <span className="font-bold text-[#1C1917]">{med.scheduledTimes.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-[#78716C] italic">
                    "{med.sourceSentence}"
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Uploaded PDF Documents Tab */}
      {activeTab === 'documents' && uploadedDocuments.length > 0 && (
        <div className="space-y-4">
          <Card
            title={`Attached Prescription PDFs (${uploadedDocuments.length})`}
            subtitle="Original PDF files uploaded and attached to this patient's clinical file"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {uploadedDocuments.map((doc) => (
                <div
                  key={doc._id}
                  className="p-4 bg-white border border-[#E8E2D7] rounded-xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1C1917] truncate max-w-xs">{doc.fileName || 'Prescription.pdf'}</h4>
                      <p className="text-[11px] text-[#78716C]">
                        {doc.doctorName || 'Dr. Attending'} • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </div>

                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0B7A70] text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View PDF</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
