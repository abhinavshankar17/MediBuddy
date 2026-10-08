const dataStore = require('./dataStore');

/**
 * Service handling patient profile and recovery data logic
 */
const patientService = {
  /**
   * Retrieve list of patients with optional filtering
   */
  async getPatients(filter = {}) {
    return await dataStore.listPatients(filter);
  },

  /**
   * Retrieve full patient profile by patientId
   */
  async getPatientById(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId parameter is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    return patient;
  },

  /**
   * Retrieve recovery-specific information for a patient
   */
  async getRecoveryInfo(patientId) {
    const patient = await this.getPatientById(patientId);

    return {
      patientId: patient._id,
      name: patient.name,
      condition: patient.condition,
      procedure: patient.procedure,
      recoveryPhase: patient.recoveryPhase,
      admissionDate: patient.admissionDate,
      dischargeDate: patient.dischargeDate,
      mobility: patient.mobility,
      dietaryPreference: patient.dietaryPreference,
      dailySchedulePreferences: patient.preferences,
      caregiverId: patient.caregiverId
    };
  },

  /**
   * Retrieve tasks strictly for this patient
   */
  async getPatientTasks(patientId, options = {}) {
    // Verify patient existence first to ensure valid patient isolation
    await this.getPatientById(patientId);

    const tasks = await dataStore.getTasksByPatient(patientId, options);
    // Double check patient isolation: every task MUST belong to patientId
    return tasks.filter(t => t.patientId === patientId);
  },

  /**
   * Retrieve verified extracted instructions for this patient
   */
  async getPatientInstructions(patientId, options = {}) {
    await this.getPatientById(patientId);

    const allItems = await dataStore.getExtractedItemsByPatient(patientId, options);
    // Strict patient isolation assertion
    const isolatedItems = allItems.filter(i => i.patientId === patientId);

    // Group instructions by category for rich client presentation
    const grouped = {
      medications: isolatedItems.filter(i => i.type === 'medication'),
      labTests: isolatedItems.filter(i => i.type === 'lab_test' || i.type === 'investigation' || i.type === 'diagnostic'),
      activities: isolatedItems.filter(i => i.type === 'activity' || i.type === 'exercise'),
      restrictions: isolatedItems.filter(i => i.type === 'restriction'),
      dietAndHydration: isolatedItems.filter(i => i.type === 'diet' || i.type === 'hydration'),
      woundCare: isolatedItems.filter(i => i.type === 'wound_care'),
      followUps: isolatedItems.filter(i => i.type === 'follow_up'),
      warningSigns: isolatedItems.filter(i => i.type === 'warning_sign'),
      monitoring: isolatedItems.filter(i => i.type === 'monitoring')
    };

    return {
      patientId,
      totalInstructions: isolatedItems.length,
      instructions: isolatedItems,
      categories: grouped
    };
  },

  /**
   * Retrieve patient's discharge summary document and associated extraction
   */
  async getDischargeSummary(patientId, options = {}) {
    const patient = await this.getPatientById(patientId);
    const document = await dataStore.getDocumentByPatient(patientId);
    const instructionsData = await this.getPatientInstructions(patientId, options);
    const tasks = await this.getPatientTasks(patientId);

    return {
      patientId: patient._id,
      patientName: patient.name,
      condition: patient.condition,
      procedure: patient.procedure,
      recoveryPhase: patient.recoveryPhase,
      admissionDate: patient.admissionDate,
      dischargeDate: patient.dischargeDate,
      document: document || null,
      instructionsSummary: {
        total: instructionsData.totalInstructions,
        medicationsCount: instructionsData.categories.medications.length,
        activitiesCount: instructionsData.categories.activities.length,
        warningSignsCount: instructionsData.categories.warningSigns.length,
        followUpsCount: instructionsData.categories.followUps.length
      },
      instructions: instructionsData.instructions,
      categories: instructionsData.categories,
      tasksSummary: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        completed: tasks.filter(t => t.status === 'completed').length
      }
    };
  }
};

module.exports = patientService;
