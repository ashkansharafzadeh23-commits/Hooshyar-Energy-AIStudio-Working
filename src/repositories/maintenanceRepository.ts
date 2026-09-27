import { db } from '../db/index.js';
import {
  AssetAlert,
  AlertRule,
  AlertType,
  MaintenanceCase,
  MaintenanceDiagnosis,
  MaintenanceAction,
  MaintenanceAssignmentHistory
} from '../types/maintenance.js';

export const maintenanceRepository = {
  createTechnicianProfile: (profile: any): any => {
    const prof = db.createProfessional({
      userId: profile.userId,
      fullName: profile.name,
      phone: profile.phone,
      specialties: profile.skills || [],
      serviceCities: profile.serviceLocations || [],
      yearsExperience: 5,
      bio: '',
      profileImageUrl: '',
      certifications: profile.certifications ? profile.certifications.map((c: any) => ({ title: c.title, imageUrl: '' })) : []
    });
    if (profile.approvalStatus === 'APPROVED') {
      db.updateProfessionalStatus(prof.id, 'approved');
    }
    if (profile.rating !== undefined) {
      db.updateProfessional(prof.id, { rating: profile.rating });
    }
    return { ...prof, userId: profile.userId };
  },

  // Alerts
  getAlerts: (projectId?: string, assetId?: string): AssetAlert[] => {
    return db.getAssetAlerts(projectId, assetId);
  },

  getAlertById: (id: string): AssetAlert | undefined => {
    return db.getAssetAlertById(id);
  },

  createAlert: (alert: Omit<AssetAlert, 'id' | 'detectedAt' | 'createdAt' | 'updatedAt' | 'alertCode' | 'alertType'> & { detectedAt?: string; alertCode?: string; alertType?: AlertType; createdAt?: string; updatedAt?: string }): AssetAlert => {
    return db.createAssetAlert(alert);
  },

  updateAlert: (id: string, updates: Partial<AssetAlert>): AssetAlert | null => {
    return db.updateAssetAlert(id, updates);
  },

  deleteAlert: (id: string): boolean => {
    return db.deleteAssetAlert(id);
  },

  findActiveAlert: (assetId: string, ruleId?: string, metricType?: string): AssetAlert | undefined => {
    const alerts = db.getAssetAlerts(undefined, assetId);
    return alerts.find(a => {
      const isActive = a.status === 'TRIGGERED' || a.status === 'ACKNOWLEDGED';
      if (!isActive) return false;
      if (ruleId && a.ruleId === ruleId) return true;
      if (metricType && a.metricType === metricType) return true;
      return false;
    });
  },

  // Rules
  getRules: (projectId?: string, assetId?: string): AlertRule[] => {
    return db.getAlertRules(projectId, assetId);
  },

  getRuleById: (id: string): AlertRule | undefined => {
    return db.getAlertRuleById(id);
  },

  createRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule => {
    return db.createAlertRule(rule);
  },

  updateRule: (id: string, updates: Partial<AlertRule>): AlertRule | null => {
    return db.updateAlertRule(id, updates);
  },

  deleteRule: (id: string): boolean => {
    return db.deleteAlertRule(id);
  },

  // Cases
  getCases: (projectId?: string, assetId?: string): MaintenanceCase[] => {
    return db.getMaintenanceCases(projectId, assetId);
  },

  getAllCases: (): MaintenanceCase[] => {
    return db.getMaintenanceCases();
  },
  getCaseById: (id: string): MaintenanceCase | undefined => {
    return db.getMaintenanceCaseById(id);
  },

  createCase: (mCase: Omit<MaintenanceCase, 'id' | 'createdAt' | 'updatedAt' | 'caseNumber' | 'maintenanceCode' | 'reportedBy' | 'reportedAt'> & { caseNumber?: string; maintenanceCode?: string; reportedBy?: string; reportedAt?: string }): MaintenanceCase => {
    return db.createMaintenanceCase(mCase);
  },

  updateCase: (id: string, updates: Partial<MaintenanceCase>): MaintenanceCase | null => {
    return db.updateMaintenanceCase(id, updates);
  },

  deleteCase: (id: string): boolean => {
    return db.deleteMaintenanceCase(id);
  },

  // Diagnoses
  getDiagnoses: (assetId?: string, alertId?: string): MaintenanceDiagnosis[] => {
    return db.getMaintenanceDiagnoses(assetId, alertId);
  },

  getDiagnosisById: (id: string): MaintenanceDiagnosis | undefined => {
    return db.getMaintenanceDiagnosisById(id);
  },

  createDiagnosis: (diag: Omit<MaintenanceDiagnosis, 'id' | 'createdAt'>): MaintenanceDiagnosis => {
    return db.createMaintenanceDiagnosis(diag);
  },

  updateDiagnosis: (id: string, updates: Partial<MaintenanceDiagnosis>): MaintenanceDiagnosis | null => {
    return db.updateMaintenanceDiagnosis(id, updates);
  },

  // Actions
  getActions: (caseId: string): MaintenanceAction[] => {
    return db.getMaintenanceActions(caseId);
  },

  createAction: (action: Omit<MaintenanceAction, 'id' | 'createdAt'> & { createdAt?: string }): MaintenanceAction => {
    return db.createMaintenanceAction(action);
  },

  // Assignment History
  getAssignmentHistories: (caseId?: string): MaintenanceAssignmentHistory[] => {
    return db.getMaintenanceAssignmentHistories(caseId);
  },

  createAssignmentHistory: (history: Omit<MaintenanceAssignmentHistory, 'id' | 'assignedAt'> & { assignedAt?: string }): MaintenanceAssignmentHistory => {
    return db.createMaintenanceAssignmentHistory(history);
  },

  updateAssignmentHistory: (id: string, updates: Partial<MaintenanceAssignmentHistory>): MaintenanceAssignmentHistory | null => {
    return db.updateMaintenanceAssignmentHistory(id, updates);
  }
};
