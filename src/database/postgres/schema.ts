import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, real, doublePrecision, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Users & Orgs ---
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  name: text('name').notNull(),
  roles: jsonb('roles').default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'owner', 'epc', 'financier', 'supplier'
  status: text('status').notNull().default('ACTIVE'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Portfolios ---
export const portfolios = pgTable('portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  projectIds: jsonb('project_ids').default('[]'),
  assetIds: jsonb('asset_ids').default('[]'),
  settings: jsonb('settings'),
  stalledThresholdDays: integer('stalled_threshold_days'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Projects ---
export const energyProjects = pgTable('energy_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  status: text('status').notNull(),
  projectType: text('project_type'),
  targetCapacityKw: integer('target_capacity_kw'),
  estimatedBudgetIRR: doublePrecision('estimated_budget_irr'),
  location: jsonb('location'),
  site: jsonb('site'),
  energyRequirement: jsonb('energy_requirement'),
  stalledThresholdDays: integer('stalled_threshold_days'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: text('role').notNull(),
  status: text('status').default('ACTIVE'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const projectActivities = pgTable('project_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id).notNull(),
  eventType: text('event_type').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Assets ---
export const energyAssets = pgTable('energy_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetCode: text('asset_code').notNull(),
  name: text('name').notNull(),
  projectId: uuid('project_id').references(() => energyProjects.id),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  epcId: uuid('epc_id').references(() => organizations.id),
  status: text('status').notNull(), // 'COMMISSIONED', 'OPERATIONAL', 'UNDER_MAINTENANCE'
  capacityKw: integer('capacity_kw').notNull(),
  location: jsonb('location'),
  commercialOperationDate: timestamp('commercial_operation_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const assetComponents = pgTable('asset_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').references(() => energyAssets.id).notNull(),
  componentType: text('component_type').notNull(),
  brand: text('brand'),
  model: text('model'),
  serialNumber: text('serial_number'),
  capacity: real('capacity'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Telemetry & Monitoring ---
export const telemetrySources = pgTable('telemetry_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').references(() => energyAssets.id).notNull(),
  sourceType: text('source_type').notNull(),
  protocol: text('protocol').notNull(),
  status: text('status').notNull(),
  credentials: jsonb('credentials'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const telemetryReadings = pgTable('telemetry_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').references(() => telemetrySources.id).notNull(),
  assetId: uuid('asset_id').references(() => energyAssets.id).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  parameter: text('parameter').notNull(),
  value: doublePrecision('value').notNull(),
  unit: text('unit'),
});

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').references(() => energyAssets.id).notNull(),
  severity: text('severity').notNull(),
  category: text('category').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull(), // 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

// --- Execution & Contracts ---
export const projectContracts = pgTable('project_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  contractType: text('contract_type').notNull(),
  status: text('status').notNull(),
  totalValueIRR: doublePrecision('total_value_irr'),
  signedDocumentUrl: text('signed_document_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Financing ---
export const financingRequests = pgTable('financing_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  status: text('status').notNull(),
  requestedAmount: doublePrecision('requested_amount'),
  ownerEquity: doublePrecision('owner_equity'),
  totalProjectCost: doublePrecision('total_project_cost'),
  readinessScore: integer('readiness_score'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const financingOffers = pgTable('financing_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  financingRequestId: uuid('financing_request_id').references(() => financingRequests.id).notNull(),
  financialPartnerProfileId: uuid('financial_partner_profile_id').notNull(),
  status: text('status').notNull(),
  offeredAmount: doublePrecision('offered_amount').notNull(),
  interestRate: doublePrecision('interest_rate').notNull(),
  tenorMonths: integer('tenor_months').notNull(),
  terms: jsonb('terms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Procurement ---
export const procurementPackages = pgTable('procurement_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  title: text('title').notNull(),
  status: text('status').notNull(),
  budget: doublePrecision('budget'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  supplierId: uuid('supplier_id').references(() => organizations.id).notNull(),
  packageId: uuid('package_id').references(() => procurementPackages.id),
  status: text('status').notNull(),
  totalAmount: doublePrecision('total_amount').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Defining Relations
export const energyProjectsRelations = relations(energyProjects, ({ many, one }) => ({
  members: many(projectMembers),
  contracts: many(projectContracts),
  financingRequests: many(financingRequests),
  assets: many(energyAssets),
  owner: one(users, {
    fields: [energyProjects.ownerId],
    references: [users.id],
  }),
}));

// --- Verified Solar Project Showcase (Stage D.2-P2B-2A) ---
export const showcaseProjects = pgTable('showcase_projects', {
  id: text('id').primaryKey(),
  internalProjectRefId: text('internal_project_ref_id'),
  internalAssetRefId: text('internal_asset_ref_id'),

  // Presentation fields
  publicTitle: text('public_title').notNull(),
  location: jsonb('location').notNull(), // { province: string, city: string }
  installedCapacityKw: doublePrecision('installed_capacity_kw').notNull(),
  operationalStatus: text('operational_status').notNull(), // 'OPERATIONAL' | 'COMMISSIONED'
  statusLabel: text('status_label'),
  commissioningDate: text('commissioning_date'),

  measuredProduction: jsonb('measured_production'), // { value, unit, period, source }
  timeSeriesData: jsonb('time_series_data'), // [{ label, value }]

  publicImageUrl: text('public_image_url'),
  connectionDescription: text('connection_description'),

  // Private governance and verification evidence
  ownerConsent: jsonb('owner_consent').notNull(), // { isGranted, consentingPartyName, consentDocumentReferenceId, consentedAt, withdrawnAt }
  technicalEvidence: jsonb('technical_evidence').notNull(), // { evidenceType, documentReferenceId, verifiedAt, verifiedBy, isValid }

  publicationStatus: text('publication_status').notNull().default('DRAFT'),
  displayOrder: integer('display_order').notNull().default(0),
  rejectionReason: text('rejection_reason'),
  unpublishReason: text('unpublish_reason'),
  version: integer('version').notNull().default(1),

  createdByUserId: text('created_by_user_id').notNull(),
  reviewedByUserId: text('reviewed_by_user_id'),
  reviewedAt: timestamp('reviewed_at'),
  publishedByUserId: text('published_by_user_id'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// --- Smart Maintenance Domain (Stage F.5 Phase P1) ---
// ============================================================================

export const alertRules = pgTable('alert_rules', {
  id: text('id').primaryKey(),
  projectId: text('project_id'),
  assetId: text('asset_id'),
  name: text('name').notNull(),
  description: text('description'),
  metricType: text('metric_type'),
  ruleType: text('rule_type').notNull(),
  operator: text('operator').notNull(), // '>', '<', '>=', '<=', '==', '!='
  thresholdValue: doublePrecision('threshold_value'),
  thresholdPercent: doublePrecision('threshold_percent'),
  durationMinutes: integer('duration_minutes'),
  cooldownMinutes: integer('cooldown_minutes'),
  severity: text('severity').notNull(), // 'INFO', 'WARNING', 'HIGH', 'CRITICAL'
  enabled: boolean('enabled').notNull().default(true),
  isEnabled: boolean('is_enabled'), // Distinct legacy alias
  condition: jsonb('condition'),
  sourceType: text('source_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('idx_alert_rules_project_id').on(table.projectId),
  assetIdx: index('idx_alert_rules_asset_id').on(table.assetId),
}));

export const assetAlerts = pgTable('asset_alerts', {
  id: text('id').primaryKey(),
  alertCode: text('alert_code').notNull().unique(), // e.g. ALT-HSE-000001
  projectId: text('project_id').notNull(), // UUID or 'CUSTOMER_DIRECT'
  assetId: text('asset_id').notNull(), // UUID or 'UNREGISTERED'
  componentId: text('component_id'),
  sourceId: text('source_id'),
  source: text('source'),
  alertType: text('alert_type').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull(), // 'TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED', etc.
  title: text('title').notNull(),
  description: text('description').notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
  firstObservedAt: timestamp('first_observed_at', { withTimezone: true }),
  lastObservedAt: timestamp('last_observed_at', { withTimezone: true }),
  metricType: text('metric_type'),
  observedValue: doublePrecision('observed_value'),
  metricValue: doublePrecision('metric_value'),
  expectedValue: doublePrecision('expected_value'),
  deviationPercent: doublePrecision('deviation_percent'),
  thresholdRuleId: text('threshold_rule_id'),
  ruleId: text('rule_id'),
  thresholdValue: doublePrecision('threshold_value'),
  performanceSnapshotId: text('performance_snapshot_id'),
  healthAssessmentId: text('health_assessment_id'),
  investigationNotes: jsonb('investigation_notes').default('[]'),
  maintenanceCaseId: text('maintenance_case_id'),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  acknowledgedBy: text('acknowledged_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by'),
  resolutionNote: text('resolution_note'),
  resolutionNotes: text('resolution_notes'), // Distinct legacy alias
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('idx_asset_alerts_project_id').on(table.projectId),
  assetIdx: index('idx_asset_alerts_asset_id').on(table.assetId),
  caseIdx: index('idx_asset_alerts_case_id').on(table.maintenanceCaseId),
  statusIdx: index('idx_asset_alerts_status').on(table.status),
}));

export const maintenanceCases = pgTable('maintenance_cases', {
  id: text('id').primaryKey(),
  maintenanceCode: text('maintenance_code').notNull().unique(), // e.g. MNT-HSE-000001
  caseNumber: text('case_number'), // e.g. MC-2026-0001
  projectId: text('project_id').notNull(), // Supports project UUID and 'CUSTOMER_DIRECT'
  assetId: text('asset_id').notNull(), // Supports asset UUID, 'UNREGISTERED', 'STANDALONE'
  componentId: text('component_id'),
  equipmentType: text('equipment_type'),
  symptoms: jsonb('symptoms').default('[]'),
  alertIds: jsonb('alert_ids').default('[]'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  reportedBy: text('reported_by').notNull(),
  reportedAt: timestamp('reported_at', { withTimezone: true }).notNull(),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  diagnosisId: text('diagnosis_id'),
  assignedTechnicianId: text('assigned_technician_id'), // User UUID or Professional profile ID
  assignedTechnicianName: text('assigned_technician_name'),
  assignedTechnicianPhone: text('assigned_technician_phone'),
  assignedOrganizationId: text('assigned_organization_id'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  scheduledDate: text('scheduled_date'), // Jalali/formatted string e.g. '1403/07/15'
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  completedDate: text('completed_date'),
  closureNotes: text('closure_notes'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: text('verified_by'),
  verificationNotes: text('verification_notes'),
  verificationPassed: boolean('verification_passed'),
  resolutionSummary: text('resolution_summary'),
  rootCause: text('root_cause'),
  actionsTaken: jsonb('actions_taken'),
  photos: jsonb('photos').default('[]'),
  documents: jsonb('documents').default('[]'),
  billDoc: jsonb('bill_doc'),
  attachments: jsonb('attachments').default('[]'), // CaseAttachment[]
  downtimeMinutes: integer('downtime_minutes'),
  laborCost: numeric('labor_cost', { precision: 20, scale: 0 }),
  partsCost: numeric('parts_cost', { precision: 20, scale: 0 }),
  totalCost: numeric('total_cost', { precision: 20, scale: 0 }),
  totalCostIrr: numeric('total_cost_irr', { precision: 20, scale: 0 }),
  totalLaborHours: doublePrecision('total_labor_hours'),
  sparePartsUsed: jsonb('spare_parts_used').default('[]'), // SparePartUsage[]
  currency: text('currency').default('IRR'),
  postMaintenanceCheck: jsonb('post_maintenance_check'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => ({
  projectIdx: index('idx_maintenance_cases_project_id').on(table.projectId),
  assetIdx: index('idx_maintenance_cases_asset_id').on(table.assetId),
  assignedTechIdx: index('idx_maintenance_cases_tech_id').on(table.assignedTechnicianId),
  statusIdx: index('idx_maintenance_cases_status').on(table.status),
  reportedByIdx: index('idx_maintenance_cases_reported_by').on(table.reportedBy),
}));

export const maintenanceAssignmentHistories = pgTable('maintenance_assignment_histories', {
  id: text('id').primaryKey(),
  maintenanceCaseId: text('maintenance_case_id').notNull(),
  technicianId: text('technician_id').notNull(), // User UUID or Professional profile ID
  organizationId: text('organization_id'),
  assignedBy: text('assigned_by').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').notNull(), // 'ASSIGNED', 'ACCEPTED', 'REJECTED', 'CANCELLED'
  notes: text('notes'),
}, (table) => ({
  caseIdx: index('idx_maint_assign_hist_case_id').on(table.maintenanceCaseId),
  techIdx: index('idx_maint_assign_hist_tech_id').on(table.technicianId),
}));

export const maintenanceActions = pgTable('maintenance_actions', {
  id: text('id').primaryKey(),
  maintenanceCaseId: text('maintenance_case_id').notNull(),
  caseId: text('case_id'), // Distinct legacy alias
  actionType: text('action_type').notNull(),
  description: text('description').notNull(),
  componentId: text('component_id'),
  replacedComponentId: text('replaced_component_id'),
  newComponentSerial: text('new_component_serial'),
  newComponentModel: text('new_component_model'),
  performedBy: text('performed_by'),
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
  resultStatus: text('result_status'),
  notes: text('notes'),
  hoursSpent: doublePrecision('hours_spent'),
  partsReplaced: jsonb('parts_replaced').default('[]'),
  clientRequestId: text('client_request_id'),
  payloadHash: text('payload_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  caseIdx: index('idx_maint_actions_case_id').on(table.maintenanceCaseId),
  caseClientRequestIdx: uniqueIndex('idx_maint_actions_case_client_req').on(table.maintenanceCaseId, table.clientRequestId),
}));

export const maintenanceDiagnoses = pgTable('maintenance_diagnoses', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  assetId: text('asset_id').notNull(),
  alertId: text('alert_id'),
  componentId: text('component_id'),
  diagnosisStatus: text('diagnosis_status'),
  facts: jsonb('facts').default('[]'),
  inferences: jsonb('inferences').default('[]'),
  possibleCauses: jsonb('possible_causes').default('[]'),
  likelyRootCauses: jsonb('likely_root_causes'),
  evidence: jsonb('evidence').default('[]'),
  recommendedActions: jsonb('recommended_actions'),
  requiredExpertise: jsonb('required_expertise').default('[]'),
  warrantyStatus: text('warranty_status'),
  warrantyDetails: text('warranty_details'),
  warrantyImpact: jsonb('warranty_impact'),
  symptoms: jsonb('symptoms').default('[]'),
  rootCauses: jsonb('root_causes'),
  actions: jsonb('actions'),
  method: text('method'),
  diagnosisMethod: text('diagnosis_method'), // Distinct legacy alias
  confidence: doublePrecision('confidence'),
  confidenceScore: doublePrecision('confidence_score'), // Distinct legacy alias
  rawAiResponse: jsonb('raw_ai_response'),
  generatedBy: text('generated_by'),
  evidenceCategorized: jsonb('evidence_categorized'),
  requiredTools: jsonb('required_tools').default('[]'),
  requiredParts: jsonb('required_parts').default('[]'),
  safetyGuidance: jsonb('safety_guidance').default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('idx_maint_diag_project_id').on(table.projectId),
  assetIdx: index('idx_maint_diag_asset_id').on(table.assetId),
  alertIdx: index('idx_maint_diag_alert_id').on(table.alertId),
}));
